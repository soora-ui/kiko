import { motion, useMotionValue, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ClockCounterClockwise } from '@phosphor-icons/react'
import type { Question } from '../lib/types'
import { hangLabel } from '../lib/reminders'
import { PriorityBadge, StatusBadge } from './StatusBadge'

const SWIPE_THRESHOLD = 96

/**
 * Карточка в ленте: свайп вправо — закрыть, влево — отложить,
 * тап — открыть карточку вопроса.
 */
export default function QuestionCardItem({
  question,
  index,
  onSwipeClose,
  onSwipeSnooze,
  onStatusTap,
}: {
  question: Question
  index: number
  onSwipeClose: () => void
  onSwipeSnooze: () => void
  onStatusTap: () => void
}) {
  const navigate = useNavigate()
  const x = useMotionValue(0)
  const closeOpacity = useTransform(x, [24, SWIPE_THRESHOLD], [0, 1])
  const snoozeOpacity = useTransform(x, [-SWIPE_THRESHOLD, -24], [1, 0])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
      transition={{
        duration: 0.5,
        ease: [0.32, 0.72, 0, 1],
        delay: index * 0.04,
      }}
      className="relative mb-3"
    >
      {/* подложки под свайп */}
      <div className="absolute inset-1.5 flex items-center justify-between rounded-[1.4rem] px-6 pointer-events-none">
        <motion.span style={{ opacity: closeOpacity }} className="text-sage">
          <CheckCircle size={28} weight="light" />
        </motion.span>
        <motion.span style={{ opacity: snoozeOpacity }} className="text-muted">
          <ClockCounterClockwise size={28} weight="light" />
        </motion.span>
      </div>

      <motion.div
        drag="x"
        style={{ x }}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        dragTransition={{ bounceStiffness: 400, bounceDamping: 30 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_THRESHOLD) onSwipeClose()
          else if (info.offset.x < -SWIPE_THRESHOLD) onSwipeSnooze()
        }}
        onClick={() => navigate(`/question/${question.id}`)}
        className="bezel cursor-pointer"
      >
        <div className="bezel-core p-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* тап по бейджу — быстрая перекидка статуса */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStatusTap()
              }}
              className="min-h-[28px]"
            >
              <StatusBadge status={question.status} />
            </button>
            <PriorityBadge priority={question.priority} />
            <span className="ml-auto text-[11px] text-muted">
              {hangLabel(question.created_at)}
            </span>
          </div>
          <p className="mt-2.5 font-medium leading-snug line-clamp-3">
            {question.summary}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
            {question.author && <span>{question.author}</span>}
            {question.status === 'waiting' && question.waiting_for && (
              <span>жду: {question.waiting_for}</span>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
