'use client';
import { useState } from 'react';
import { ArrowRight, Check, Plus } from 'lucide-react';
import type { CompanionEvent } from '@/lib/jourvis/config';
const answers = [
  {
    label: 'Opening hours?',
    answer: 'Monday to Friday, 9 AM–5 PM.',
    detail: 'The useful answer. Without the waiting.',
  },
  {
    label: 'First consultation?',
    answer: 'A complimentary 30-minute conversation.',
    detail: 'A clear next step, from the details provided.',
  },
  {
    label: 'Where are you?',
    answer: 'Online consultations, wherever you are.',
    detail: 'One less detail for a customer to chase.',
  },
];
export default function OutcomeSections({
  send,
}: {
  send: (event: CompanionEvent) => void;
}) {
  const [question, setQuestion] = useState(0);
  const [time, setTime] = useState('11:00 AM');
  const [gathered, setGathered] = useState(false);
  return (
    <section
      id="outcomes"
      tabIndex={-1}
      className="outcomes-section section-wrap"
      aria-labelledby="outcomes-title"
      data-world-section="outcomes"
    >
      <div className="section-topline">
        <p className="eyebrow">02 / From scattered to sorted</p>
      </div>
      <h2 id="outcomes-title" className="outcomes-heading">
        Less to hold in your head.
        <br />
        <span className="muted-heading">More space for what’s next.</span>
      </h2>
      <article className="outcome-row">
        <div className="outcome-copy">
          <span className="outcome-number">01</span>
          <h3>
            Questions,
            <br />
            answered.
          </h3>
          <p>
            The opening hours. The first step. The small details customers need.
            Turn the information you provide into a useful answer.
          </p>
        </div>
        <div className="outcome-visual answer-visual" data-quiet-zone>
          <span className="mono visual-label">SAMPLE BUSINESS INFORMATION</span>
          <div
            className="question-fragments"
            aria-label="Sample customer questions"
          >
            {answers.map((item, i) => (
              <button
                key={item.label}
                aria-pressed={i === question}
                onClick={() => {
                  setQuestion(i);
                  send('COMPLETE');
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="connection-line" aria-hidden>
            <span />
          </div>
          <div className="resolved-answer" aria-live="polite">
            <span className="answer-check" aria-hidden>
              <Check size={16} />
            </span>
            <div>
              <p>{answers[question].answer}</p>
              <small>{answers[question].detail}</small>
            </div>
          </div>
        </div>
      </article>
      <article className="outcome-row">
        <div className="outcome-copy">
          <span className="outcome-number">02</span>
          <h3>
            Appointments,
            <br />
            organized.
          </h3>
          <p>
            Bring the back-and-forth into one clear next step. A service, a
            time, and the details that help everyone arrive prepared.
          </p>
        </div>
        <div className="outcome-visual time-visual" data-quiet-zone>
          <div className="visual-label-row">
            <span className="mono">A LITTLE ROOM IN THE DAY</span>
            <span className="small-gold-square" aria-hidden />
          </div>
          <div className="timeline-slots" aria-label="Sample time options">
            {['9:30 AM', '11:00 AM', '2:30 PM'].map((slot) => (
              <button
                key={slot}
                aria-pressed={time === slot}
                onClick={() => {
                  setTime(slot);
                  send('COMPLETE');
                }}
              >
                {slot}
                <span aria-hidden>{time === slot ? '✓' : '+'}</span>
              </button>
            ))}
          </div>
          <div className="mini-appointment" aria-live="polite">
            <div className="date-stamp">
              <span>SAMPLE</span>
              <strong>TUE</strong>
            </div>
            <div>
              <span className="field-label">Discovery consultation</span>
              <p>
                {time} <span>· 30 minutes</span>
              </p>
            </div>
            <span className="preview-pill">Preview</span>
          </div>
          <p className="visual-footnote">
            Fictional times · No booking is created
          </p>
        </div>
      </article>
      <article className="outcome-row">
        <div className="outcome-copy">
          <span className="outcome-number">03</span>
          <h3>
            People,
            <br />
            kept in the loop.
          </h3>
          <p>
            Some conversations need a person. Keep the useful context together,
            so a handoff feels like a continuation, not starting over.
          </p>
        </div>
        <div className="outcome-visual handoff-visual" data-quiet-zone>
          <span className="mono visual-label">
            THE RIGHT CONTEXT, IN THE RIGHT HANDS
          </span>
          <div
            className={'handoff-details ' + (gathered ? 'gathered' : '')}
            aria-live="polite"
          >
            {gathered ? (
              <dl>
                <div>
                  <dt>Who</dt>
                  <dd>Alex · Sample customer</dd>
                </div>
                <div>
                  <dt>What</dt>
                  <dd>A question about a custom project</dd>
                </div>
                <div>
                  <dt>Next</dt>
                  <dd>A conversation with the studio team</dd>
                </div>
              </dl>
            ) : (
              <div className="loose-details">
                <span>“I’m Alex.”</span>
                <span>“A custom project…”</span>
                <span>“Could we talk?”</span>
              </div>
            )}
          </div>
          <button
            className="text-link handoff-action"
            onClick={() => {
              setGathered(!gathered);
              send(gathered ? 'RESET' : 'HANDOFF');
            }}
          >
            {gathered
              ? 'See the scattered details'
              : 'Bring the details together'}
            {gathered ? (
              <Plus size={16} aria-hidden />
            ) : (
              <ArrowRight size={16} aria-hidden />
            )}
          </button>
          <p className="visual-footnote">
            Sample summary · No person is notified
          </p>
        </div>
      </article>
    </section>
  );
}
