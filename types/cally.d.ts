declare namespace JSX {
  interface IntrinsicElements {
    'calendar-date': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      value?: string;
      class?: string;
      onchange?: (e: any) => void;
    }, HTMLElement>;
    'calendar-month': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  }
}

declare module 'cally';
