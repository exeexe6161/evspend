// Pages Function for "/verlauf" only.
import { handleGeoRequest } from '../lib/geo-redirect.mjs';
export const onRequest = (context) => handleGeoRequest(context);
