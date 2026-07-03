import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useNavigate } from 'react-router-dom'
import type { Question, Status } from '../lib/types'
import { OPEN_STATUSES, STATUS_LABEL } from '../lib/types'
import { hangLabel } from '../lib/reminders'
import { PriorityBadge } from './StatusBadge'
import Enso from './Enso'

const COLUMNS: Status[] = [...OPEN_STATUSES, 'closed']

// Целевая колонка — та, что под пальцем (широкая карточка на узком экране
// пересекает две колонки сразу, и по площади пересечения выигрывает исходная)
const collisionDetection: CollisionDetection = (args) => {
  const byPointer = pointerWithin(args)
  return byPointer.length > 0 ? byPointer : rectIntersection(args)
}

/**
 * Доска в духе Яндекс Трекера: колонки по статусам, карточку берём
 * удержанием (~0.2 с) и тащим в нужную колонку. Колонки листаются
 * горизонтально; у краёв доска подкручивается сама (autoScroll dnd-kit).
 */
export default function BoardView({
  questions,
  onDropStatus,
  onDropNeedsInput,
  onDropClose,
}: {
  questions: Question[]
  onDropStatus: (q: Question, status: Status) => void
  onDropNeedsInput: (q: Question, intent: 'waiting' | 'clarification') => void
  onDropClose: (q: Question) => void
}) {
  const [active, setActive] = useState<Question | null>(null)

  // Задержка активации: короткий тап остаётся кликом (открыть карточку),
  // удержание поднимает карточку в drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  )

  const onDragStart = (e: DragStartEvent) => {
    setActive((e.active.data.current?.question as Question) ?? null)
  }

  const onDragEnd = (e: DragEndEvent) => {
    const q = active
    setActive(null)
    const target = e.over?.id as Status | undefined
    if (!q || !target || target === q.status) return
    if (target === 'closed') return onDropClose(q)
    if (target === 'waiting' || target === 'clarification') {
      return onDropNeedsInput(q, target)
    }
    onDropStatus(q, target)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div
        className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory
          -mx-4 px-4 pb-2 items-start"
      >
        {COLUMNS.map((status) => (
          <Column
            key={status}
            status={status}
            items={questions.filter((q) => q.status === status)}
            dragging={active !== null}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 300, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' }}>
        {active && (
          <div className="rotate-2 scale-105">
            <CardBody question={active} lifted />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function Column({
  status,
  items,
  dragging,
}: {
  status: Status
  items: Question[]
  dragging: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const isClosed = status === 'closed'

  return (
    <div
      ref={setNodeRef}
      className={`snap-center shrink-0 w-[76vw] max-w-[320px] rounded-[1.75rem]
        p-1.5 ring-1 transition-colors duration-300
        ${
          isOver
            ? 'bg-sakura/15 ring-sakura/50'
            : dragging
              ? 'bg-black/[0.05] ring-black/10'
              : 'bg-black/[0.03] ring-black/5'
        }`}
    >
      <div className="flex items-baseline gap-2 px-4 pt-2.5 pb-2">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">
          {STATUS_LABEL[status]}
        </h2>
        {!isClosed && <span className="text-xs font-bold text-sakura">{items.length}</span>}
      </div>

      <div className="flex flex-col gap-1.5 min-h-[96px] pb-0.5">
        {!isClosed && items.map((q) => <BoardCard key={q.id} question={q} />)}
        {isClosed && (
          <div className="flex flex-col items-center py-5 text-center px-4">
            <Enso size={56} className="text-sage" />
            <p className="mt-1 text-xs text-muted">
              Перетащи сюда — закроем с решением
            </p>
          </div>
        )}
        {!isClosed && items.length === 0 && (
          <p className="px-4 py-4 text-xs text-muted text-center">Пусто</p>
        )}
      </div>
    </div>
  )
}

function BoardCard({ question }: { question: Question }) {
  const navigate = useNavigate()
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: question.id,
    data: { question },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/question/${question.id}`)}
      style={{ touchAction: 'manipulation' }}
      className={isDragging ? 'opacity-30' : ''}
    >
      <CardBody question={question} />
    </div>
  )
}

function CardBody({ question, lifted = false }: { question: Question; lifted?: boolean }) {
  return (
    <div
      className={`bg-white rounded-[calc(1.75rem-0.375rem)] p-3.5 cursor-grab
        ${lifted ? 'shadow-[0_16px_40px_rgba(58,55,51,0.18)]' : 'shadow-soft'}`}
    >
      <div className="flex items-center gap-2">
        <PriorityBadge priority={question.priority} />
        <span className="ml-auto text-[11px] text-muted">
          {hangLabel(question.created_at)}
        </span>
      </div>
      <p className="mt-1.5 text-sm font-medium leading-snug line-clamp-3">
        {question.summary}
      </p>
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
        {question.author && <span className="line-clamp-1">{question.author}</span>}
        {question.status === 'waiting' && question.waiting_for && (
          <span>жду: {question.waiting_for}</span>
        )}
        {question.status === 'clarification' && question.clarification && (
          <span className="line-clamp-1">уточнить: {question.clarification}</span>
        )}
      </div>
    </div>
  )
}
