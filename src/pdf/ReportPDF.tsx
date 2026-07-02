import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import { STATUS_LABEL } from '../lib/types'
import { fmtDuration, reportStats, type ReportData } from '../lib/stats'

// Без регистрации кириллического шрифта react-pdf выдаёт кракозябры.
Font.register({
  family: 'PT Sans',
  fonts: [
    { src: '/fonts/PTSans-Regular.ttf' },
    { src: '/fonts/PTSans-Bold.ttf', fontWeight: 700 },
  ],
})

const C = {
  paper: '#FBFAF7',
  sakura: '#E8B4B8',
  sakuraSoft: '#F9EEEF',
  sage: '#A8C3A0',
  ink: '#3A3733',
  muted: '#8B857C',
  zebra: '#F6F4EF',
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'PT Sans',
    fontSize: 9,
    color: C.ink,
    backgroundColor: '#FFFFFF',
    padding: 36,
  },
  header: {
    backgroundColor: C.sakuraSoft,
    borderRadius: 10,
    padding: 16,
    marginBottom: 18,
  },
  h1: { fontSize: 16, fontWeight: 700 },
  headerMeta: { fontSize: 9, color: C.muted, marginTop: 4 },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: C.zebra,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: 700 },
  statLabel: { fontSize: 8, color: C.muted, marginTop: 3, textAlign: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6 },
  row: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6 },
  rowZebra: { backgroundColor: C.zebra },
  headRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.sakura,
  },
  headCell: { fontWeight: 700, fontSize: 8, color: C.muted },
  cDate: { width: '11%' },
  cAuthor: { width: '17%' },
  cText: { width: '34%' },
  cResolution: { width: '28%' },
  cTime: { width: '10%' },
  oText: { width: '52%' },
  oStatus: { width: '20%' },
  oHang: { width: '17%' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    textAlign: 'center',
    fontSize: 7,
    color: C.muted,
  },
})

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

const hangDays = (iso: string, end: Date): string => {
  const d = Math.floor((end.getTime() - new Date(iso).getTime()) / 86400_000)
  return d < 1 ? '< 1 дня' : `${d} дн`
}

export default function ReportPDF({ data }: { data: ReportData }) {
  const stats = reportStats(data)
  const period = `${data.from.toLocaleDateString('ru-RU')} — ${data.to.toLocaleDateString('ru-RU')}`

  return (
    <Document title={`Отчёт по обращениям ${period}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.h1}>Отчёт по работе с обращениями</Text>
          <Text style={s.headerMeta}>
            {data.userName ? `${data.userName} · ` : ''}Период: {period} ·
            Сформирован: {new Date().toLocaleDateString('ru-RU')}
          </Text>
        </View>

        <View style={s.statRow}>
          <View style={s.statBox}>
            <Text style={s.statValue}>{stats.arrived}</Text>
            <Text style={s.statLabel}>поступило</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{stats.closed}</Text>
            <Text style={s.statLabel}>закрыто</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{stats.open}</Text>
            <Text style={s.statLabel}>в работе на конец периода</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{stats.avgCloseLabel}</Text>
            <Text style={s.statLabel}>среднее время закрытия</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Закрытые вопросы</Text>
        <View style={s.headRow}>
          <Text style={[s.headCell, s.cDate]}>Дата</Text>
          <Text style={[s.headCell, s.cAuthor]}>Автор</Text>
          <Text style={[s.headCell, s.cText]}>Суть</Text>
          <Text style={[s.headCell, s.cResolution]}>Решение</Text>
          <Text style={[s.headCell, s.cTime]}>В работе</Text>
        </View>
        {data.closed.length === 0 && (
          <Text style={{ color: C.muted, padding: 6 }}>
            За период закрытых вопросов нет
          </Text>
        )}
        {data.closed.map((q, i) => (
          <View key={q.id} style={[s.row, ...(i % 2 ? [s.rowZebra] : [])]} wrap={false}>
            <Text style={s.cDate}>{q.closed_at ? fmtDay(q.closed_at) : '—'}</Text>
            <Text style={s.cAuthor}>{q.author ?? '—'}</Text>
            <Text style={s.cText}>{q.summary}</Text>
            <Text style={s.cResolution}>{q.resolution ?? '—'}</Text>
            <Text style={s.cTime}>
              {q.closed_at
                ? fmtDuration(
                    new Date(q.closed_at).getTime() - new Date(q.created_at).getTime(),
                  )
                : '—'}
            </Text>
          </View>
        ))}

        {data.openAtEnd.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: 18 }]}>
              Открытые на конец периода
            </Text>
            <View style={s.headRow}>
              <Text style={[s.headCell, s.oText]}>Суть</Text>
              <Text style={[s.headCell, s.oStatus]}>Статус</Text>
              <Text style={[s.headCell, s.oHang]}>Висит</Text>
            </View>
            {data.openAtEnd.map((q, i) => (
              <View
                key={q.id}
                style={[s.row, ...(i % 2 ? [s.rowZebra] : [])]}
                wrap={false}
              >
                <Text style={s.oText}>{q.summary}</Text>
                <Text style={s.oStatus}>{STATUS_LABEL[q.status]}</Text>
                <Text style={s.oHang}>{hangDays(q.created_at, data.to)}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={s.footer} fixed>
          Сформировано автоматически · Кико
        </Text>
      </Page>
    </Document>
  )
}
