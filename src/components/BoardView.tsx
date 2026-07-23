import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useNavigate } from 'react-router-dom'
import { Archive } from '@phosphor-icons/react'
import type { Question, Status } from '../lib/types'
import { OPEN_STATUSES, STATUS_LABEL } from '../lib/types'
import { hangLabel } from '../lib/reminders'
import { CategoryBadge, LinkedBadge, PriorityBadge } from './StatusBadge'
import Enso from './Enso'

/** Колонки доски: статусы + две «сливные» — Выполнено и Не актуально. */
type BoardColumn = Status | 'irrelevant'

const COLUMNS: BoardColumn[] = [...OPEN_STATUSES, 'closed', 'irrelevant']

const COLUMN_LABEL: Record<BoardColumn, string> = {
  ...STATUS_LABEL,
  irrelevant: 'Не актуально',
}

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
  onDropDiscard,
  onAck,
}: {
  questions: Question[]
  onDropStatus: (q: Question, status: Status) => void
  onDropNeedsInput: (q: Question, intent: 'waiting' | 'clarification') => void
  onDropClose: (q: Question) => void
  onDropDiscard: (q: Question) => void
  onAck: (q: Question) => void
}) {
  const [active, setActive] = useState<Question | null>(null)

  // Раздельные сенсоры вместо PointerSensor: на iOS он дерётся со скроллом
  // страницы (карточка дёргается). TouchSensor после активации блокирует
  // скролл (preventDefault на touchmove) — перетаскивание плавное.
  // Палец: удержание ~0.25 с; мышь: сдвиг на 6px (клик остаётся кликом).
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 10 },
    }),
  )

  const onDragStart = (e: DragStartEvent) => {
    setActive((e.active.data.current?.question as Question) ?? null)
  }

  const onDragEnd = (e: DragEndEvent) => {
    const q = active
    setActive(null)
    const target = e.over?.id as BoardColumn | undefined
    if (!q || !target || target === q.status) return
    if (target === 'closed') return onDropClose(q)
    if (target === 'irrelevant') return onDropDiscard(q)
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
      {/* snap отключаем на время перетаскивания — иначе он дерётся
          с автопрокруткой dnd-kit и доска дёргается */}
      <div
        className={`flex gap-3 overflow-x-auto no-scrollbar
          -mx-4 px-4 pb-2 items-start
          ${active ? '' : 'snap-x snap-mandatory md:snap-none'}`}
      >
        {COLUMNS.map((column) => (
          <Column
            key={column}
            column={column}
            items={questions.filter((q) => q.status === column)}
            dragging={active !== null}
            onAck={onAck}
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
  column,
  items,
  dragging,
  onAck,
}: {
  column: BoardColumn
  items: Question[]
  dragging: boolean
  onAck: (q: Question) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column })
  // «Сливные» колонки — только цели для дропа, карточки в них не живут
  const isSink = column === 'closed' || column === 'irrelevant'

  return (
    <div
      ref={setNodeRef}
      className={`snap-center shrink-0 w-[76vw] max-w-[300px] rounded-[1.75rem]
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
          {COLUMN_LABEL[column]}
        </h2>
        {!isSink && <span className="text-xs font-bold text-sakura">{items.length}</span>}
      </div>

      <div className="flex flex-col gap-1.5 min-h-[96px] pb-0.5">
        {!isSink &&
          items.map((q) => <BoardCard key={q.id} question={q} onAck={onAck} />)}
        {column === 'closed' && (
          <div className="flex flex-col items-center py-5 text-center px-4">
            <Enso size={56} className="text-sage" />
            <p className="mt-1 text-xs text-muted">
              Перетащи сюда — закроем с решением
            </p>
          </div>
        )}
        {column === 'irrelevant' && (
          <div className="flex flex-col items-center py-5 text-center px-4">
            <Archive size={40} weight="light" className="text-muted/60 my-2" />
            <p className="mt-1 text-xs text-muted">
              Перетащи сюда — в архив с пометкой причины
            </p>
          </div>
        )}
        {!isSink && items.length === 0 && (
          <p className="px-4 py-4 text-xs text-muted text-center">Пусто</p>
        )}
      </div>
    </div>
  )
}

function BoardCard({
  question,
  onAck,
}: {
  question: Question
  onAck: (q: Question) => void
}) {
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
      style={{
        touchAction: 'manipulation',
        // без этого iOS на долгий тап показывает выделение/callout —
        // и перетаскивание дёргается
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      className={isDragging ? 'opacity-30' : ''}
    >
      <CardBody question={question} onAck={onAck} />
    </div>
  )
}

function CardBody({
  question,
  lifted = false,
  onAck,
}: {
  question: Question
  lifted?: boolean
  onAck?: (q: Question) => void
}) {
  return (
    <div
      className={`bg-white rounded-[calc(1.75rem-0.375rem)] p-3.5 cursor-grab
        ${lifted ? 'shadow-[0_16px_40px_rgba(58,55,51,0.18)]' : 'shadow-soft'}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <PriorityBadge priority={question.priority} />
        <CategoryBadge category={question.category} />
        {question.parent_id && <LinkedBadge />}
        {/* Долбёжка активна — кнопка гасит её без смены статуса */}
        {question.awaiting_ack && onAck && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAck(question)
            }}
            className="rounded-full bg-terra/15 text-terra px-2.5 py-0.5
              text-[11px] font-semibold min-h-[24px]"
          >
            ⏰ Помню
          </button>
        )}
        <span className="ml-auto text-[11px] text-muted">
          {hangLabel(question.created_at)}
        </span>
      </div>
      <p className="mt-1.5 text-sm font-medium leading-snug line-clamp-3">
        {question.summary}
      </p>
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
        {question.author && <span className="line-clamp-1">{question.author}</span>}
        {question.dp_number && <span>ДП №{question.dp_number}</span>}
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
