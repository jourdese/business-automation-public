import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
const faqs = [
  [
    'What can I try with Jourvis?',
    'Choose from 21 sample businesses and talk naturally. Ask about prices, work through a request, or arrange a test appointment. This uses the same Jourvis conversation engine as the Messenger demo.',
  ],
  [
    'Is this connected to a real business?',
    'The business details are fictional, but the conversation is live. A test booking can check the demo calendar and send an invitation to the email you provide, after you confirm. It does not reserve a service at a real clinic, studio, or supplier.',
  ],
  [
    'What happens when I ask for a person?',
    'Jourvis gathers the context and follows the selected demo’s handoff process. A saved demo request is not a promise that a real staff member will contact you. For Jourvis sales or support, use the contact link below.',
  ],
  [
    'What information does Jourvis work from?',
    'Jourvis uses the selected business’s published demo configuration: services, prices, opening hours, policies, and intake questions. It remembers the useful details within your own web session, separate from Messenger. A language model can help interpret an unfamiliar request; it does not invent business prices or availability.',
  ],
];
export default function PrinciplesSection() {
  return (
    <section
      className="principles-section"
      id="principles"
      tabIndex={-1}
      data-world-section="principles"
      aria-labelledby="principles-title"
    >
      <div className="section-wrap">
        <p className="eyebrow">03 / Helpful, not in the way</p>
        <div className="principles-layout">
          <h2 id="principles-title">
            Here when you need me.
            <br />
            <span className="muted-heading">Space when you don’t.</span>
          </h2>
          <div className="principles-list">
            <p className="principles-intro">
              Good assistance should make things feel simpler. These are the
              principles behind Jourvis.
            </p>
            <div>
              <span>01</span>
              <p>
                Works from the business
                <br />
                information you provide.
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                Keeps the useful details
                <br />
                together and easy to follow.
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                Makes room for a person
                <br />
                when a conversation needs one.
              </p>
            </div>
          </div>
        </div>
        <div className="faq-layout" id="jourvis-faq" tabIndex={-1}>
          <h3>A few good questions.</h3>
          <Accordion className="faq" defaultValue={[]} multiple>
            {faqs.map(([question, answer], i) => (
              <AccordionItem key={question} value={'faq-' + i}>
                <AccordionTrigger>{question}</AccordionTrigger>
                <AccordionContent>
                  <p>{answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
