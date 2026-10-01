// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InterminalSettlement
 * @notice Production Settlement and Autonomous Execution Protocol for Arc Mainnet (Chain ID 5042).
 * @dev Enforces EIP-712 TradeTickets, Bounded Agentic Mandates, and Immutable SHA-256 Audit Anchoring.
 *      Arc Native Gas: 18-decimal Native USDC.
 *      Arc ERC-20 Precompile: 0x3600000000000000000000000000000000000000.
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
}

contract InterminalSettlement {
    // --- Constant Definitions ---
    string public constant NAME = "Interminal";
    string public constant VERSION = "1";
    uint256 public constant ARC_CHAIN_ID = 5042;
    address public constant ARC_ROUTER = 0x52FE40c00530db2e43d01652f903870571A14AFD;
    address public constant ARC_USDC_ERC20 = 0x3600000000000000000000000000000000000000;

    // --- EIP-712 TypeHashes ---
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 public constant TRADE_TICKET_TYPEHASH = keccak256(
        "TradeTicket(address trader,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 nonce,uint256 deadline)"
    );

    bytes32 public constant AGENT_MANDATE_TYPEHASH = keccak256(
        "AgentMandate(address authorizer,address agent,uint256 maxCumulativeSpend,uint256 maxSpendPerTx,uint256 maxSlippageBps,uint256 allowedPairsMask,uint256 expiry,uint256 nonce)"
    );

    // --- Structs ---
    struct TradeTicket {
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 nonce;
        uint256 deadline;
    }

    struct AgentMandate {
        address authorizer;
        address agent;
        uint256 maxCumulativeSpend;
        uint256 maxSpendPerTx;
        uint256 maxSlippageBps;
        uint256 allowedPairsMask;
        uint256 expiry;
        uint256 nonce;
    }

    struct AgentExecution {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 pairIndex; // Bit index in allowedPairsMask
    }

    // --- State Variables ---
    address public owner;
    bool public paused;
    uint256 private _status; // Reentrancy guard

    mapping(address => uint256) public traderNonces;
    mapping(address => uint256) public mandateNonces;
    mapping(bytes32 => uint256) public mandateCumulativeSpend;
    mapping(bytes32 => bool) public revokedMandates;
    mapping(bytes32 => uint256) public anchoredReceipts;

    // --- Events ---
    event TradeSettled(
        bytes32 indexed receiptHash,
        address indexed trader,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );

    event AgentTradeSettled(
        bytes32 indexed receiptHash,
        address indexed authorizer,
        address indexed agent,
        bytes32 mandateId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );

    event MandateRevoked(address indexed authorizer, bytes32 indexed mandateId, uint256 nonce);
    event ReceiptAnchored(bytes32 indexed receiptHash, address indexed submitter, uint256 timestamp);
    event PausedStateChanged(bool isPaused);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "Interminal: caller is not the owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Interminal: protocol is paused");
        _;
    }

    modifier nonReentrant() {
        require(_status != 2, "Interminal: reentrant call");
        _status = 2;
        _;
        _status = 1;
    }

    // --- Constructor ---
    constructor() {
        owner = msg.sender;
        _status = 1;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // --- Fallback & Receive ---
    receive() external payable {}

    // --- EIP-712 Domain Separator ---
    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(NAME)),
                keccak256(bytes(VERSION)),
                block.chainid,
                address(this)
            )
        );
    }

    // --- Hash Computations ---
    function hashTradeTicket(TradeTicket calldata ticket) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR(),
                keccak256(
                    abi.encode(
                        TRADE_TICKET_TYPEHASH,
                        ticket.trader,
                        ticket.tokenIn,
                        ticket.tokenOut,
                        ticket.amountIn,
                        ticket.minAmountOut,
                        ticket.nonce,
                        ticket.deadline
                    )
                )
            )
        );
    }

    function hashAgentMandate(AgentMandate calldata mandate) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR(),
                keccak256(
                    abi.encode(
                        AGENT_MANDATE_TYPEHASH,
                        mandate.authorizer,
                        mandate.agent,
                        mandate.maxCumulativeSpend,
                        mandate.maxSpendPerTx,
                        mandate.maxSlippageBps,
                        mandate.allowedPairsMask,
                        mandate.expiry,
                        mandate.nonce
                    )
                )
            )
        );
    }

    // --- ECDSA Verification ---
    function recoverSigner(bytes32 digest, bytes calldata signature) public pure returns (address) {
        require(signature.length == 65, "Interminal: invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        // EIP-2 signature malleability prevention
        require(
            uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D57617F723A82F65BCF3719C2CE64B0,
            "Interminal: invalid signature 's' value"
        );
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "Interminal: invalid signature v");
        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "Interminal: signature recovery failed");
        return signer;
    }

    // --- User Trade Ticket Settlement ---
    /**
     * @notice Executes a user-authorized EIP-712 TradeTicket against Arc AMM liquidity.
     * @param ticket The full TradeTicket struct.
     * @param signature The EIP-712 signature created by ticket.trader.
     */
    function executeTradeTicket(
        TradeTicket calldata ticket,
        bytes calldata signature
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        require(block.timestamp <= ticket.deadline, "Interminal: ticket expired");
        require(ticket.amountIn > 0, "Interminal: zero input amount");
        require(ticket.nonce == traderNonces[ticket.trader], "Interminal: invalid trader nonce");

        // Verify EIP-712 signature
        bytes32 digest = hashTradeTicket(ticket);
        address signer = recoverSigner(digest, signature);
        require(signer == ticket.trader, "Interminal: signature mismatch");

        // Increment nonce (fail-closed replay protection)
        traderNonces[ticket.trader]++;

        // Pull input token from trader
        _safeTransferFrom(ticket.tokenIn, ticket.trader, address(this), ticket.amountIn);

        // Perform swap via Arc router
        amountOut = _executeSwap(ticket.tokenIn, ticket.tokenOut, ticket.amountIn, ticket.minAmountOut, ticket.trader);
        require(amountOut >= ticket.minAmountOut, "Interminal: slippage limit exceeded");

        // Anchor receipt hash into Arc on-chain state
        bytes32 receiptHash = keccak256(
            abi.encodePacked(ticket.trader, ticket.tokenIn, ticket.tokenOut, ticket.amountIn, amountOut, ticket.nonce, block.timestamp)
        );
        anchoredReceipts[receiptHash] = block.timestamp;

        emit TradeSettled(
            receiptHash,
            ticket.trader,
            ticket.tokenIn,
            ticket.tokenOut,
            ticket.amountIn,
            amountOut,
            block.timestamp
        );
    }

    // --- Autonomous Agentic Execution ---
    /**
     * @notice Executes a trade delegated to an autonomous AI agent within verified bounds.
     * @param mandate The authorizer's bounded mandate specification.
     * @param mandateSig The EIP-712 signature of the authorizer.
     * @param execution The trade execution parameters triggered by the agent.
     */
    function executeAgentTrade(
        AgentMandate calldata mandate,
        bytes calldata mandateSig,
        AgentExecution calldata execution
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        require(msg.sender == mandate.agent, "Interminal: caller is not the authorized agent");
        require(block.timestamp <= mandate.expiry, "Interminal: mandate expired");
        require(mandate.nonce == mandateNonces[mandate.authorizer], "Interminal: invalid mandate nonce");

        bytes32 mandateDigest = hashAgentMandate(mandate);
        require(!revokedMandates[mandateDigest], "Interminal: mandate was revoked");

        // Verify authorizer signature
        address authorizer = recoverSigner(mandateDigest, mandateSig);
        require(authorizer == mandate.authorizer, "Interminal: authorizer signature mismatch");

        // Gating Check 1: Pair Bitmask verification
        require((mandate.allowedPairsMask & (1 << execution.pairIndex)) != 0, "Interminal: pair not authorized by mandate");

        // Gating Check 2: Max Spend Per Tx limit
        require(execution.amountIn <= mandate.maxSpendPerTx, "Interminal: exceeds per-tx spend limit");

        // Gating Check 3: Cumulative Spend limit
        uint256 currentCumulative = mandateCumulativeSpend[mandateDigest];
        require(currentCumulative + execution.amountIn <= mandate.maxCumulativeSpend, "Interminal: exceeds cumulative spend budget");

        // Update cumulative spend
        mandateCumulativeSpend[mandateDigest] = currentCumulative + execution.amountIn;

        // Pull tokens from authorizer
        _safeTransferFrom(execution.tokenIn, mandate.authorizer, address(this), execution.amountIn);

        // Perform swap delivering tokens directly to authorizer
        amountOut = _executeSwap(execution.tokenIn, execution.tokenOut, execution.amountIn, execution.minAmountOut, mandate.authorizer);
        require(amountOut >= execution.minAmountOut, "Interminal: agent slippage limit exceeded");

        // Anchor audit receipt
        bytes32 receiptHash = keccak256(
            abi.encodePacked(
                mandate.authorizer,
                mandate.agent,
                mandateDigest,
                execution.tokenIn,
                execution.tokenOut,
                execution.amountIn,
                amountOut,
                block.timestamp
            )
        );
        anchoredReceipts[receiptHash] = block.timestamp;

        emit AgentTradeSettled(
            receiptHash,
            mandate.authorizer,
            mandate.agent,
            mandateDigest,
            execution.tokenIn,
            execution.tokenOut,
            execution.amountIn,
            amountOut,
            block.timestamp
        );
    }

    // --- Mandate Revocation ---
    /**
     * @notice Allows a user to immediately revoke all active mandates or a specific mandate.
     */
    function revokeMandate(AgentMandate calldata mandate) external {
        require(msg.sender == mandate.authorizer, "Interminal: unauthorized revocation");
        bytes32 mandateDigest = hashAgentMandate(mandate);
        revokedMandates[mandateDigest] = true;
        uint256 revokedNonce = mandateNonces[msg.sender];
        mandateNonces[msg.sender]++;
        emit MandateRevoked(msg.sender, mandateDigest, revokedNonce);
    }

    // --- Immutable Receipt Anchoring ---
    /**
     * @notice Anchors an off-chain AI reasoning or execution receipt hash directly to Arc blockchain.
     * @param receiptHash The SHA-256 or keccak-256 hash of the audit receipt.
     */
    function anchorReceipt(bytes32 receiptHash) external returns (uint256 timestamp) {
        require(anchoredReceipts[receiptHash] == 0, "Interminal: receipt already anchored");
        anchoredReceipts[receiptHash] = block.timestamp;
        emit ReceiptAnchored(receiptHash, msg.sender, block.timestamp);
        return block.timestamp;
    }

    function isReceiptAnchored(bytes32 receiptHash) external view returns (bool, uint256) {
        uint256 ts = anchoredReceipts[receiptHash];
        return (ts > 0, ts);
    }

    // --- Internal Swap Helper ---
    function _executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) internal returns (uint256 amountOut) {
        address router = ARC_ROUTER;
        _safeApprove(tokenIn, router, 0);
        _safeApprove(tokenIn, router, amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256 balBefore = IERC20(tokenOut).balanceOf(recipient);

        try IUniswapV2Router02(router).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amountIn,
            minAmountOut,
            path,
            recipient,
            block.timestamp + 300
        ) {
            uint256 balAfter = IERC20(tokenOut).balanceOf(recipient);
            amountOut = balAfter - balBefore;
        } catch {
            revert("Interminal: Arc AMM swap execution reverted; slippage or liquidity check failed");
        }
    }

    // --- Safe ERC-20 Helpers ---
    function _safeTransfer(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transfer.selector, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Interminal: ERC20 transfer failed");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Interminal: ERC20 transferFrom failed");
    }

    function _safeApprove(address token, address spender, uint256 value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.approve.selector, spender, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Interminal: ERC20 approve failed");
    }

    // --- Admin Controls ---
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedStateChanged(_paused);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Interminal: invalid new owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
