import { Icon } from "../ui/Icon";
import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { USYC_APY, USYC_YIELD_AS_OF, ARC } from "../../constants/arc";
import { Button } from "../ui/Button";

export const LandingView: React.FC = () => {
  const { launchDemo, openMainnetReview, startJudgeTour, setView } =
    useAppStore();
  const [capital, setCapital] = useState(10000);
  const [buffer, setBuffer] = useState(2500);
  const liquid = Math.min(capital, buffer);
  const allocated = capital - liquid;
  const modeledYield = allocated * USYC_APY;
  const startScenario = () => {
    launchDemo();
    useAppStore.setState({
      balances: { USDC: capital },
      targetBufferUsd: liquid,
      stressTestAmount: Math.min(capital, liquid * 1.5),
      amount: Math.min(capital, 1000),
    });
    setView("portfolio");
  };
  return (
    <div className="welcome-shell">
      <section className="welcome-hero">
        <div className="welcome-copy">
          <div className="eyebrow flex items-center gap-2">
            <span className="status-dot" />
            Live on Arc Mainnet · Chain 5042
          </div>
          <h1>
            Keep USDC ready.
            <br />
            Put the rest to work.
            <br />
            <span>Prove every move.</span>
          </h1>
          <p className="welcome-description">
            A focused Arc mainnet treasury proof. Keep an operating USDC reserve,
            review a USDC → USYC router quote, sign it in your wallet, and verify
            the confirmed settlement without trusting this interface.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Button
              size="lg"
              variant="primary"
              onClick={openMainnetReview}
              rightIcon={
                <Icon
                  name="arrow_forward"
                  className="material-symbols-outlined text-lg"
                />
              }
            >
              Review live Arc flow
            </Button>
            <Button size="lg" variant="secondary" onClick={launchDemo}>
              Try the demo
            </Button>
          </div>
          <p className="text-muted text-xs mt-4">
            Arc uses USDC for gas. Connecting a wallet only loads state; execution still requires an explicit review and wallet signature.
          </p>
          <button onClick={startJudgeTour} className="welcome-walkthrough">
            <Icon name="play_circle" className="material-symbols-outlined" />
            See the workflow
            <span className="text-muted">90-second reviewer walkthrough</span>
          </button>
        </div>
        <div className="welcome-scenario">
          <div className="flex justify-between items-center mb-7">
            <span className="eyebrow">Small treasury scenario</span>
            <span className="scenario-tag">Scenario</span>
          </div>
          <label className="text-sub text-sm block" htmlFor="scenario-capital">
            Treasury capital
          </label>
          <div className="scenario-amount">
            ${capital.toLocaleString()}
            <span>USDC</span>
          </div>
          <input
            id="scenario-capital"
            aria-label="Treasury capital"
            type="range"
            min="1000"
            max="50000"
            step="1000"
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
          />
          <div className="scenario-presets">
            {[5000, 10000, 25000, 50000].map((n) => (
              <button
                key={n}
                onClick={() => setCapital(n)}
                aria-pressed={capital === n}
                className={capital === n ? "active" : ""}
              >
                ${n / 1000}k
              </button>
            ))}
          </div>
          <div className="flex justify-between items-center mt-7 mb-3">
            <label htmlFor="scenario-buffer" className="text-sm text-sub">
              Operating cash buffer
            </label>
            <select
              id="scenario-buffer"
              value={buffer}
              onChange={(e) => setBuffer(Number(e.target.value))}
              className="rounded-lg border border-themed px-2 py-1 text-sm"
            >
              {[500, 1000, 2500, 5000].map((n) => (
                <option key={n} value={n}>
                  ${n.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          <div
            className="allocation-bar"
            aria-label={`${((liquid / capital) * 100).toFixed(0)} percent liquid cash`}
          >
            <span style={{ width: `${(liquid / capital) * 100}%` }} />
          </div>
          <div className="scenario-split">
            <div>
              <small>Keep liquid</small>
              <strong>${liquid.toLocaleString()}</strong>
            </div>
            <div>
              <small>Potential USYC move</small>
              <strong>${allocated.toLocaleString()}</strong>
            </div>
          </div>
          <div className="scenario-return">
            <div>
              <small>Reference yield estimate</small>
              <strong>
                +$
                {modeledYield.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </strong>
            </div>
            <span>
              {(USYC_APY * 100).toFixed(3)}%<small>Reference yield</small>
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed mt-3 mb-5">
            Illustrative estimate using the {USYC_YIELD_AS_OF} yield reference.
            Fees, access restrictions, price changes, and execution costs aren't
            included.
          </p>
          <Button
            fullWidth
            variant="secondary"
            onClick={startScenario}
            rightIcon={
              <Icon
                name="arrow_forward"
                className="material-symbols-outlined text-lg"
              />
            }
          >
            Try this cash policy in the demo
          </Button>
        </div>
      </section>
      <section className="welcome-workflow" aria-label="Why Interminal is Arc-native">
        <div className="welcome-section-title">
          <span className="eyebrow">Why Arc</span>
          <h2>The chain is part of the product.</h2>
        </div>
        <div className="workflow-grid">
          <div className="workflow-card">
            <div>
              <Icon name="payments" className="material-symbols-outlined" />
              <span>01</span>
            </div>
            <h3>USDC is the operating asset and gas</h3>
            <p>Arc lets the same dollar-denominated asset support treasury operations and pay network fees, without a separate volatile gas token.</p>
          </div>
          <div className="workflow-card">
            <div>
              <Icon name="bolt" className="material-symbols-outlined" />
              <span>02</span>
            </div>
            <h3>The settlement is on Arc mainnet</h3>
            <p>The live path reviews a router quote, signs a bounded EIP-712 ticket, and submits it to the deployed settlement contract on Chain 5042.</p>
          </div>
          <div className="workflow-card">
            <div>
              <Icon name="verified_user" className="material-symbols-outlined" />
              <span>03</span>
            </div>
            <h3>Execution can be checked without a wallet</h3>
            <p>A reviewer can verify the transaction, exact TradeSettled event, route, raw amounts, block, and receipt integrity independently.</p>
          </div>
        </div>
      </section>
      <section className="welcome-workflow" aria-label="Treasury workflow">
        <div className="welcome-section-title">
          <span className="eyebrow">From decision to evidence</span>
          <h2>Every move has a trail.</h2>
        </div>
        <div className="workflow-grid">
          {[
            {
              n: "01",
              icon: "account_balance_wallet",
              title: "Know your position",
              text: "Load wallet holdings and decide how much USDC to keep ready for operations.",
              view: "portfolio",
            },
            {
              n: "02",
              icon: "tune",
              title: "Review the move",
              text: "Inspect the route, input amount, and minimum output before approving and signing.",
              view: "terminal",
            },
            {
              n: "03",
              icon: "receipt_long",
              title: "Inspect the evidence",
              text: "Follow transaction links and check receipt integrity against confirmed execution.",
              view: "ledger",
            },
          ].map((step) => (
            <button
              key={step.n}
              onClick={() =>
                setView(step.view as "portfolio" | "terminal" | "ledger")
              }
              className="workflow-card"
            >
              <div>
                <Icon name={step.icon} className="material-symbols-outlined" />
                <span>{step.n}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <span className="workflow-link">
                Explore
                <Icon
                  name="arrow_forward"
                  className="material-symbols-outlined text-base"
                />
              </span>
            </button>
          ))}
        </div>
      </section>
      <footer className="welcome-footer">
        <span>USDC operations. Wallet-controlled execution.</span>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => setView("proof")} className="hover:text-themed transition-colors">
            Verify an Arc execution
          </button>
          <a
            href="https://github.com/Tajudeeen/interminal-"
            target="_blank"
            rel="noreferrer"
            className="hover:text-themed transition-colors"
          >
            GitHub ↗
          </a>
          <a
            href="https://x.com/Deeen_Codes"
            target="_blank"
            rel="noreferrer"
            className="hover:text-themed transition-colors"
          >
            Builder ↗
          </a>
          <a
            href={`${ARC.explorer}/address/${ARC.settlement}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-themed transition-colors"
          >
            Settlement ↗
          </a>
        </div>
      </footer>
    </div>
  );
};
