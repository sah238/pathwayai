const base = "inline-flex items-center justify-center font-semibold no-underline transition-colors";
const disabled =
  "disabled:cursor-not-allowed disabled:border disabled:border-light-gray disabled:bg-tint disabled:text-georgetown-gray";

export const buttonStyles = {
  primary: `${base} gap-2.5 rounded-[14px] bg-bright-blue px-[30px] py-[17px] text-lg text-white hover:bg-georgetown-blue ${disabled}`,
  header: `${base} rounded-xl bg-georgetown-blue px-5 py-[11px] text-white hover:bg-bright-blue`,
  compact: `${base} min-h-12 rounded-[14px] bg-bright-blue px-6 text-base text-white hover:bg-georgetown-blue ${disabled}`,
  secondary: `${base} min-h-12 rounded-[14px] border border-georgetown-blue bg-white px-6 text-base text-georgetown-blue hover:bg-tint`,
};
