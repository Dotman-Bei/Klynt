import type { Metadata } from 'next';
import { ClaimCard, GateCard, SeasonCard } from '@/components/app/Rewards';

export const metadata: Metadata = { title: 'Rewards' };

export default function RewardsPage() {
  return (
    <>
      <div className="title-row">
        <div>
          <h1>Rewards</h1>
          <p className="title-row__line">Rewards are off this season. Nothing you play is owed anything until the pool is funded.</p>
        </div>
      </div>

      <div className="grid6 detail-grid">
        <div className="span3"><ClaimCard /></div>
        <div className="span3"><SeasonCard /></div>

        <div className="span3"><GateCard /></div>

        <section className="card span3" aria-labelledby="how-title">
          <div className="card__head">
            <h2 id="how-title" className="card__title">How rewards will work</h2>
          </div>
          <ul className="rules">
            <li>Every season states its pool before it starts, or says that rewards are off.</li>
            <li>Only accepted runs count, and each wallet has a daily cap.</li>
            <li>There is no fixed earning rate. Scores never guarantee a payout or any income.</li>
            <li>Every claim is one signed transaction, bound to your wallet, the season and the chain.</li>
            <li>Pausing a season stops new claims. Claims already confirmed stay valid.</li>
          </ul>
        </section>

        <section className="card span6" aria-labelledby="history-title">
          <div className="card__head">
            <h2 id="history-title" className="card__title">Claim history</h2>
            <span className="card__meta">Read from the reward contract</span>
          </div>
          <table className="table table--flush">
            <thead>
              <tr>
                <th>Date</th>
                <th>Season</th>
                <th>Game</th>
                <th className="num">Amount</th>
                <th className="num">Transaction</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5}>
                  <p className="empty empty--inline">No claims yet. Each claim will link to its transaction on the BOT Chain explorer.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
