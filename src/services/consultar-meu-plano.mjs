import {ApiError} from '../errors.mjs';
const deny=message=>{throw new ApiError(403,'ACESSO_NEGADO',message);};
function limit(value){if(value===undefined)return null;if(!Number.isSafeInteger(value)||value<0)throw new ApiError(409,'PLANO_INVALIDO','O plano possui um limite inválido. Solicite revisão à administração.');return value;}
function millis(value){if(typeof value?.toMillis==='function')return value.toMillis();return null;}
export async function consultarMeuPlano({identity,readDocument,now=Date.now()}){
  if(!identity?.uid||identity.email_verified!==true)deny('É necessário usar uma conta com e-mail verificado.');
  const profile=await readDocument('sparkProfiles/'+identity.uid);
  if(!profile)throw new ApiError(404,'PERFIL_AUSENTE','Seu perfil não foi localizado na plataforma.');
  if(profile.role!=='teacher'||profile.status!=='active')deny('Disponível somente para professores aprovados e ativos.');
  const planId=profile.planId===undefined?'free':profile.planId;
  if(typeof planId!=='string'||!/^[-\w]{1,100}$/.test(planId))throw new ApiError(409,'PLANO_INVALIDO','O identificador do plano precisa ser revisado.');
  const plan=await readDocument('sparkPlans/'+planId);
  if(!plan)throw new ApiError(404,'PLANO_AUSENTE','O plano não está cadastrado. Solicite sua configuração à administração.');
  if(typeof plan.price!=='number'||!Number.isFinite(plan.price)||plan.price<0||(plan.active!==undefined&&typeof plan.active!=='boolean'))throw new ApiError(409,'PLANO_INVALIDO','Preço ou situação do plano inválidos.');
  const expires=millis(profile.planExpiresAt),paid=plan.price>0;
  const status=plan.active===false?'desativado':paid&&(expires===null||!Number.isFinite(expires))?'validade_pendente':paid&&expires<=now?'vencido':'ativo';
  const warnings=[];
  if(plan.active===undefined)warnings.push('Campo active ausente: aplicado o padrão legado ativo.');
  const features={};for(const name of ['tracking','team','warnings','questionBank','courseAccess'])features[name]=plan.features?.[name]===true;
  const limits={alunos:limit(plan.maxStudents),perguntasPorAvaliacao:limit(plan.maxQuestions),respostasPorQuestionario:limit(plan.maxResponses)};
  if(Object.values(limits).includes(null))warnings.push('Limites ausentes retornam null: não configurado, não significa ilimitado.');
  return {versao:1,plano:{id:planId,nome:typeof plan.title==='string'?plan.title:planId},situacao:status,validade:paid&&Number.isFinite(expires)&&expires!==null?new Date(expires).toISOString():null,limites:limits,recursos:features,avisos:warnings,consultadoEm:new Date(now).toISOString()};
}
