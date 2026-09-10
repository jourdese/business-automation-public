'use client';
import { useEffect, useReducer } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  MessageSquare,
  RotateCcw,
  UserRound,
  Sparkles,
  Play,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { type CompanionEvent, motion } from '@/lib/jourvis/config';
import {
  demoReducer,
  initialDemo,
  scenarios,
  tasks,
  sampleSlots,
  type Task,
} from '@/lib/jourvis/scenarios';
import CompanionMark from './CompanionMark';
const icons = {
  question: MessageSquare,
  appointment: CalendarDays,
  handoff: UserRound,
};
export default function InteractiveDemo({
  send,
}: {
  send: (event: CompanionEvent) => void;
}) {
  const [state, dispatch] = useReducer(demoReducer, initialDemo);
  const scenario = scenarios[state.preset];
  useEffect(() => {
    if (state.phase !== 'organizing') return;
    send('ORGANIZE');
    const finish = () => {
      dispatch({ type: 'FINISH', run: state.run });
      send(state.task === 'handoff' ? 'HANDOFF' : 'COMPLETE');
    };
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const timer = window.setTimeout(finish, reduce ? 0 : motion.previewDelayMs);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.run, state.task, send]);
  const start = (task: Task) => dispatch({ type: 'START', task });
  const isDone = state.phase === 'result';
  const prompt =
    state.task === 'question'
      ? scenario.question
      : state.task === 'appointment'
        ? scenario.appointmentPrompt
        : scenario.handoffPrompt;
  const answer =
    state.task === 'question'
      ? scenario.answer
      : state.task === 'appointment'
        ? scenario.appointmentAnswer
        : scenario.handoffAnswer;
  return (
    <section
      className="demo-section section-wrap"
      id="demo"
      aria-labelledby="demo-title"
      tabIndex={-1}
      data-world-section="demo"
    >
      <div className="section-topline">
        <p className="eyebrow">01 / Let me take that</p>
        <span className="section-side-note">
          A conversation. A clear next step.
        </span>
      </div>
      <h2 id="demo-title">
        One conversation.
        <br />
        <span className="muted-heading">Everything falls into place.</span>
      </h2>
      <p className="section-intro">
        Choose a business and a task. I’ll show you what happens next.
      </p>
      <div className="demo-shell">
        <div className="demo-toolbar">
          <span className="preview-label">
            <span className="status-square" />
            Interactive preview · Sample business data
          </span>
          <button
            className="quiet-button"
            onClick={() => {
              dispatch({ type: 'RESET' });
              send('RESET');
            }}
          >
            <RotateCcw size={14} aria-hidden /> Reset
          </button>
        </div>
        <div className="demo-configuration">
          <div>
            <span className="field-label">Choose a business</span>
            <ToggleGroup
              value={[state.preset]}
              onValueChange={(values) => {
                const preset = values[0];
                if (preset === 'general' || preset === 'dental') {
                  dispatch({ type: 'PRESET', preset });
                  send('LISTEN');
                }
              }}
              className="preset-group"
              aria-label="Demo business preset"
            >
              <ToggleGroupItem value="general">
                General business
              </ToggleGroupItem>
              <ToggleGroupItem value="dental">Dental clinic</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="sample-identity">
            <span>{scenario.name}</span>
            <small>{scenario.kind}</small>
          </div>
        </div>
        <Tabs
          value={state.task}
          onValueChange={(value) => start(value as Task)}
          className="task-tabs"
        >
          <TabsList className="task-options" aria-label="Example tasks">
            {tasks.map((task) => {
              const Icon = icons[task.id];
              return (
                <TabsTrigger
                  key={task.id}
                  value={task.id}
                  onClick={() => {
                    if (state.task === task.id) start(task.id);
                  }}
                >
                  <Icon size={17} aria-hidden />
                  <span>{task.label}</span>
                  <ArrowUpRight size={15} aria-hidden className="task-arrow" />
                </TabsTrigger>
              );
            })}
          </TabsList>
          <TabsContent value={state.task} className="demo-stage">
            <div className="conversation">
              <div className="conversation-heading">
                <span className="little-presence" aria-hidden>
                  <CompanionMark />
                </span>
                <span>
                  Jourvis
                  <span className="assistant-label">
                    Your everyday assistant
                  </span>
                </span>
                <span className="local-badge">Preview</span>
              </div>
              <div
                className="conversation-messages"
                aria-live="polite"
                aria-atomic="true"
                aria-busy={state.phase === 'organizing'}
              >
                {state.phase === 'ready' ? (
                  <>
                    <p className="assistant-message">
                      Hi, I’m Jourvis. What can I take off your list?
                    </p>
                    <p className="conversation-hint">
                      Choose one of the examples above.
                      <br />
                      We’ll take it from there.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="customer-message">{prompt}</p>
                    {state.phase === 'organizing' ? (
                      <p className="organizing-label">
                        <span className="working-bits" aria-hidden>
                          ▪ ▪ ▪
                        </span>{' '}
                        Organizing this sample…
                      </p>
                    ) : (
                      <p className="assistant-message">{answer}</p>
                    )}
                    {isDone && state.slot && (
                      <p className="customer-message small-message">
                        {state.slot} works for me.
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="conversation-bottom">
                <span className="mono">Your conversation, made simpler</span>
                <button
                  className="quiet-button"
                  onClick={() => start(state.task)}
                  aria-label={
                    state.phase === 'ready'
                      ? 'Run this example'
                      : 'Replay this example'
                  }
                >
                  {state.phase === 'ready' ? (
                    <Play size={14} aria-hidden />
                  ) : (
                    <RotateCcw size={14} aria-hidden />
                  )}
                  {state.phase === 'ready' ? 'Run example' : 'Replay'}
                </button>
              </div>
            </div>
            <div
              className={'result-panel ' + (isDone ? 'has-result' : '')}
              data-particle-result
            >
              <div className="result-heading">
                <span className="mono">Your result</span>
                <span className="result-mark" aria-hidden>
                  {isDone ? <Check size={18} /> : <Sparkles size={18} />}
                </span>
              </div>
              <div aria-live="polite" aria-atomic="true">
                {!isDone ? (
                  <div className="result-empty">
                    <div className="sorted-lines" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </div>
                    <h3>See the conversation become a clear next step.</h3>
                    <p>
                      Run an example to see the useful details gathered here.
                    </p>
                  </div>
                ) : state.task === 'question' ? (
                  <div className="result-content">
                    <span className="result-kicker">A CLEAR ANSWER</span>
                    <h3>{scenario.factLabel}</h3>
                    <p className="result-fact">{scenario.fact}</p>
                    <div className="source-note">
                      <span className="field-label">
                        From the sample business information
                      </span>
                      <p>
                        {scenario.name}
                        <br />
                        {scenario.hours}
                      </p>
                    </div>
                    <p className="result-footnote">
                      A useful answer, grounded in the details provided.
                    </p>
                  </div>
                ) : state.task === 'appointment' ? (
                  <div className="result-content">
                    <span className="result-kicker">APPOINTMENT PREVIEW</span>
                    <h3>
                      {state.slot
                        ? 'A time that works.'
                        : 'Make room for a conversation.'}
                    </h3>
                    <p className="sample-date">Sample Tuesday · Asia/Manila</p>
                    <RadioGroup
                      className="sample-slots"
                      aria-label="Fictional appointment times"
                      value={state.slot ?? ''}
                      onValueChange={(value) => {
                        if (typeof value === 'string') {
                          dispatch({ type: 'SLOT', slot: value });
                          send('COMPLETE');
                        }
                      }}
                    >
                      {sampleSlots.map((slot) => (
                        <label
                          className={
                            'slot-choice ' +
                            (state.slot === slot ? 'selected' : '')
                          }
                          key={slot}
                        >
                          <RadioGroupItem value={slot} className="slot-radio" />
                          <span>{slot}</span>
                          {state.slot === slot && (
                            <Check size={14} aria-hidden />
                          )}
                        </label>
                      ))}
                    </RadioGroup>
                    {state.slot && (
                      <div className="appointment-ticket">
                        <div className="appointment-ticket-heading">
                          <CalendarDays size={22} aria-hidden />
                          <div>
                            <span>Sample Tuesday</span>
                            <strong>{state.slot}</strong>
                          </div>
                          <span className="ticket-label">Preview</span>
                        </div>
                        <dl className="appointment-summary">
                          <div>
                            <dt>Service</dt>
                            <dd>{scenario.service}</dd>
                          </div>
                          <div>
                            <dt>When</dt>
                            <dd>Sample Tuesday, {state.slot}</dd>
                          </div>
                          <div>
                            <dt>Duration</dt>
                            <dd>{scenario.duration}</dd>
                          </div>
                          <div>
                            <dt>Guest</dt>
                            <dd>Alex Santos · Sample guest</dd>
                          </div>
                        </dl>
                      </div>
                    )}
                    <p className="result-footnote">
                      {state.slot
                        ? 'Preview only. Nothing is booked or sent. Select another time to change it.'
                        : 'Choose a fictional time. No calendar is connected.'}
                    </p>
                  </div>
                ) : (
                  <div className="result-content">
                    <span className="result-kicker">PREPARED FOR A PERSON</span>
                    <h3>Ready for a human touch.</h3>
                    <dl className="handoff-summary">
                      <div>
                        <dt>Customer</dt>
                        <dd>Alex Santos · Sample customer</dd>
                      </div>
                      <div>
                        <dt>Reason</dt>
                        <dd>{scenario.handoffReason}</dd>
                      </div>
                      <div>
                        <dt>Useful context</dt>
                        <dd>{scenario.context}</dd>
                      </div>
                    </dl>
                    <p className="result-footnote">
                      A sample summary of what a person could receive. No one
                      has been notified.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <div
          className={
            'organization-bridge ' +
            (state.phase === 'organizing' ? 'is-working' : '')
          }
          data-particle-flow
          aria-hidden="true"
        >
          <span />
          <span />
        </div>
        <div className="demo-disclosure">
          <span>Made for exploring, with fictional details.</span>
          <span>No messages sent. No appointments created.</span>
        </div>
      </div>
    </section>
  );
}
