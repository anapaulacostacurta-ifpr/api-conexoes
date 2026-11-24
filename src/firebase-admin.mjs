import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {ApiError} from './errors.mjs';
export function firebaseServices(){
  // O ID do projeto é público (o mesmo de public/firebase-config.js); a variável é opcional.
  const {FIREBASE_PROJECT_ID:projectId='app-conexao-783a4',FIREBASE_CLIENT_EMAIL:clientEmail,FIREBASE_PRIVATE_KEY:key}=process.env;
  if(projectId!=='app-conexao-783a4'||!clientEmail||!key)throw new ApiError(503,'CONFIGURACAO','Configure as credenciais do Firebase no Netlify.');
  const privateKey=key.replace(/\\n/g,'\n');
  const app=getApps().find(a=>a.name==='piloto')||initializeApp({credential:cert({projectId,clientEmail,privateKey}),projectId},'piloto');
  const auth=getAuth(app),db=getFirestore(app);
  return {
    verifyToken:token=>auth.verifyIdToken(token),
    async readDocument(path){const snap=await db.doc(path).get();return snap.exists?snap.data():null;}
  };
}
