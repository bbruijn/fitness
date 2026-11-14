import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { createPortal } from 'react-dom'
import { IconClose } from './icons'
import { spring } from './motion'
import { Press } from './Press'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

/**
 * Bottom sheet: slides up, can be flicked away by its handle. Only ever opened by a tap.
 * Rendered on <body> so it floats above whatever scrolling or animating screen asked for it.
 */
export function Sheet({ open, onClose, title, children }: Props) {
  const drag = useDragControls()
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose()
            }}
          >
            <div className="sheet__grab" onPointerDown={(e) => drag.start(e)}>
              <i />
            </div>
            {title && (
              <div className="sheet__head">
                <h2 className="sheet__title">{title}</h2>
                <Press className="icon-btn" aria-label="Sluiten" onClick={onClose}>
                  <IconClose size={20} />
                </Press>
              </div>
            )}
            <div className="sheet__body">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
