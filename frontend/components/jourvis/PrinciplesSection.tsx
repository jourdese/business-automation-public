import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
const faqs = [
  [
    'What can I do in this preview?',
    'Choose a sample business and try a customer question, select a fictional appointment time, or explore a handoff summary. Everything runs locally in your browser using written example scenarios.',
  ],
  [
    'Is this connected to a real business?',
    'No. Fieldwork Studio and Cedar Dental are fictional demo configurations. The preview does not call an AI service, check a real calendar, send a message, or create an appointment.',
  ],
  [
    'What happens when I ask for a person?',
    'The preview shows a sample conversation summary that a team member could use. No person is contacted or notified. In a configured service, the handoff process would depend on the business.',
  ],
  [
    'What information does Jourvis work from?',
    'The intended experience starts with the business information provided: services, hours, appointment details, and the context relevant to the request. The examples here use sample information only.',
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
