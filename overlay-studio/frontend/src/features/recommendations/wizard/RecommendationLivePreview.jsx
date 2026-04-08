import { memo } from 'react';
import RecommendationExperiencePreview from './preview/RecommendationExperiencePreview';

function propsEqual(a, b) {
  if (a.placementType !== b.placementType) return false;
  if (a.headline !== b.headline || a.subcopy !== b.subcopy || a.ctaLabel !== b.ctaLabel) return false;
  if (a.internalSetName !== b.internalSetName) return false;
  if (a.triggerJson !== b.triggerJson) return false;
  if (JSON.stringify(a.frequencyCap ?? {}) !== JSON.stringify(b.frequencyCap ?? {})) return false;
  const pa = a.products || [];
  const pb = b.products || [];
  if (pa.length !== pb.length) return false;
  for (let i = 0; i < pa.length; i += 1) {
    if (pa[i]?.id !== pb[i]?.id) return false;
    if (pa[i]?.title !== pb[i]?.title) return false;
    if (pa[i]?.imageUrl !== pb[i]?.imageUrl) return false;
    if (pa[i]?.sku !== pb[i]?.sku) return false;
  }
  return true;
}

const RecommendationLivePreview = memo(RecommendationExperiencePreview, propsEqual);

export default RecommendationLivePreview;
