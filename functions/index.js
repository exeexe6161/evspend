// Pages Function for "/" only. Everything else is served as static asset (free, no Functions quota).
import { handleGeoRequest } from '../lib/geo-redirect.mjs';
export const onRequest = (context) => handleGeoRequest(context);
