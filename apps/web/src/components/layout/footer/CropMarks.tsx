const MARKS = [
  '-left-6 top-0 h-px w-4',
  'left-0 -top-6 h-4 w-px',
  '-right-6 top-0 h-px w-4',
  'right-0 -top-6 h-4 w-px',
  '-left-6 bottom-0 h-px w-4',
  'left-0 -bottom-6 h-4 w-px',
  '-right-6 bottom-0 h-px w-4',
  'right-0 -bottom-6 h-4 w-px',
]

export const CropMarks = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 hidden md:block"
  >
    {MARKS.map((position) => (
      <span className={`absolute bg-neutral-5 ${position}`} key={position} />
    ))}
  </div>
)
