import type { Metadata } from 'next';
import { SubmitForm } from '@/components/app/SubmitForm';

export const metadata: Metadata = { title: 'Submit a game' };

export default function SubmitGamePage() {
  return (
    <div className="settings-page">
      <div className="title-row">
        <div>
          <h1>Submit a game</h1>
          <p className="title-row__line">Send a browser game for review. Nothing goes live until an operator approves it.</p>
        </div>
      </div>

      <SubmitForm />

    </div>
  );
}
