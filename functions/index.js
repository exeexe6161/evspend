// Pages Function for "/" only. Everything else is served as static asset (free, no Functions quota).
import { geoRedirect } from '../lib/geo-redirect.mjs';
export const onRequest = (context) => geoRedirect(context.request) || context.next();
