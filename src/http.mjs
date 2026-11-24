import {ApiError} from './errors.mjs';
import {consultarMeuPlano} from './services/consultar-meu-plano.mjs';
export function createHandler({
  getServices,allowedUids,allowedOrigins=[],log=()=>{}
})
{
  return async request=>{
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
    const respond=(status,body)=>new Response(JSON.stringify(body),{status,headers});
    try{
      const origin=request.headers.get('origin');
      if(origin&&!allowedOrigins.includes(origin))throw new ApiError(403,'ORIGEM_NEGADA','Origem não autorizada para este piloto.');
      if(origin)headers['Access-Control-Allow-Origin']=origin;
      if(request.method==='OPTIONS'){headers['Access-Control-Allow-Methods']='GET, OPTIONS';headers['Access-Control-Allow-Headers']='Authorization';return new Response(null,{status:204,headers});}
      if(request.method!=='GET'){headers.Allow='GET, OPTIONS';throw new ApiError(405,'METODO_INVALIDO','Use GET para consultar o plano.');}
      if(new URL(request.url).search)throw new ApiError(400,'PARAMETROS_INVALIDOS','A consulta não recebe UID ou outros parâmetros.');
      const match=/^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization')||'');
      if(!match)throw new ApiError(401,'LOGIN_NECESSARIO','Entre com Google antes de consultar.');
      const permitted=allowedUids().split(',').map(s=>s.trim()).filter(Boolean);
      if(!permitted.length)throw new ApiError(503,'PILOTO_NAO_CONFIGURADO','Configure PILOT_ALLOWED_UIDS no Netlify.');
      const services=getServices();let identity;
      try{identity=await services.verifyToken(match[1]);}catch(e){if(e.code?.startsWith('auth/')&&e.code!=='auth/internal-error')throw new ApiError(401,'TOKEN_INVALIDO','Sua sessão expirou ou é inválida. Entre novamente.');throw e;}
      if(!permitted.includes(identity.uid))throw new ApiError(403,'FORA_DO_PILOTO','Sua conta não está autorizada a participar do piloto.');
      const result=await consultarMeuPlano({identity,readDocument:services.readDocument});
      return respond(200,result);
    }catch(e){
      if(e instanceof ApiError)
        return respond(e.status,{erro:{codigo:e.code,mensagem:e.message}});
    const mensagem = String(e.message || '');
    let diagnostico = 'ERRO_NAO_CLASSIFICADO';
    if (/private key|PEM|DECODER|ASN1/i.test(mensagem)) {
      diagnostico = 'FORMATO_DA_CHAVE_PRIVADA';
    } else if (/invalid_grant|Invalid JWT Signature|account not found/i.test(mensagem)) {
      diagnostico = 'CREDENCIAL_INVALIDA_OU_REVOGADA';
    } else if (/permission|insufficient|denied/i.test(mensagem)) {
      diagnostico = 'PERMISSAO_NEGADA';
    } else if (/disabled|not been used|SERVICE_DISABLED/i.test(mensagem)) {
      diagnostico = 'API_DESATIVADA';
    }
    const codigo = String(e.code ?? 'SEM_CODIGO');

    log(JSON.stringify({
      evento: 'falha_consultar_plano',
      diagnostico,
      codigo: /^[a-zA-Z0-9/_-]{1,80}$/.test(codigo)
        ? codigo
        : 'CODIGO_NAO_RECONHECIDO'
    }));
    return respond(500,{erro:{codigo:'ERRO_INTERNO',mensagem:'Não foi possível consultar. Confira a configuração e as permissões da conta de serviço no Netlify.'}});}
  };
}
