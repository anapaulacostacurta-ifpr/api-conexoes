import {firebaseServices} from '../../src/firebase-admin.mjs';
import {createHandler} from '../../src/http.mjs';
export default async function handler(request){
  // URL é fornecida pelo Netlify para o domínio principal do projeto.
  const origins=[process.env.URL,...(process.env.ALLOWED_ORIGINS||'').split(',')].filter(Boolean).map(s=>s.trim());
  return createHandler({getServices:firebaseServices,allowedUids:()=>process.env.PILOT_ALLOWED_UIDS||'',allowedOrigins:origins,log:code=>console.error(code)})(request);
}
