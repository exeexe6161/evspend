// Pages Function for "/verlauf" only.
import { geoRedirect } from '../lib/geo-redirect.mjs';
export const onRequest = (context) => geoRedirect(context.request) || context.next();
