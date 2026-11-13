import HistoryBrowse from './HistoryBrowse';
import NotFound from './NotFound';
import { HISTORY_ERAS } from '../utils/history';
export default function Civilizations({ params = {} }) {
  if (params.eraId && !HISTORY_ERAS.some((era) => era.id === params.eraId)) return <NotFound />;
  return <HistoryBrowse mode={params.eraId ? 'era' : 'overview'} eraId={params.eraId} />;
}
