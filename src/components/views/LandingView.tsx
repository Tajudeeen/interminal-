import { Icon } from "../ui/Icon";
import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { USYC_APY, USYC_YIELD_AS_OF, ARC } from "../../constants/arc";
import { Button } from "../ui/Button";

export const LandingView: React.FC = () => {
  const { launchDemo, openMainnetReview, startJudgeTour, setView } =
    useAppStore();
  const [capital, setCapital] = useState(250000);
  const [buffer, setBuffer] = useState(10000);
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
            Built for treasury operators
          </div>
          <h1>
            Put idle cash
            <br />
            to work.
            <br />
            <span>Keep control.</span>
          </h1>
          <p className="welcome-description">
            A treasury desk for teams holding USDC on Arc. Set your cash buffer,
            review USYC moves, and keep an inspectable receipt for every
            execution.
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
              Open mainnet workspace
            </Button>
            <Button size="lg" variant="secondary" onClick={launchDemo}>
              Try the demo
            </Button>
          </div>
          <p className="text-muted text-xs mt-4">
            Explore first. Connecting a wallet never submits a transaction.
          </p>
          <button onClick={startJudgeTour} className="welcome-walkthrough">
            <Icon name="play_circle" className="material-symbols-outlined" />
            See the workflow
            <span className="text-muted">3 minute walkthrough</span>
          </button>
        </div>
        <div className="welcome-scenario">
          <div className="flex justify-between items-center mb-7">
            <span className="eyebrow">Plan your cash position</span>
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
            min="25000"
            max="1000000"
            step="25000"
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
          />
          <div className="scenario-presets">
            {[50000, 100000, 250000, 1000000].map((n) => (
              <button
                key={n}
                onClick={() => setCapital(n)}
                aria-pressed={capital === n}
                className={capital === n ? "active" : ""}
              >
                ${n === 1000000 ? "1m" : n / 1000 + "k"}
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
              {[5000, 10000, 25000, 50000].map((n) => (
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
              <small>Potential USYC allocation</small>
              <strong>${allocated.toLocaleString()}</strong>
            </div>
          </div>
          <div className="scenario-return">
            <div>
              <small>Modeled annual return</small>
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
        <a
          href={`${ARC.explorer}/address/${ARC.settlement}`}
          target="_blank"
          rel="noreferrer"
        >
          Inspect the deployed settlement ↗
        </a>
      </footer>
    </div>
  );
};
