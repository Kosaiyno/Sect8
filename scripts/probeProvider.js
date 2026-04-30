#!/usr/bin/env node
(async function main(){
  try{
    const fs = await import('fs');
    const fsx = fs;
    if(fsx.existsSync('.env')){
      const env = fsx.readFileSync('.env','utf8');
      env.split(/\r?\n/).forEach(l=>{const m=l.match(/^([^=]+)=(.*)$/);if(m)process.env[m[1].trim()]=m[2].trim();});
    }

    const providerAddress = process.argv[2] || process.env.OG_COMPUTE_PROVIDER || '0x25F8f01cA76060ea40895472b1b79f76613Ca497';
    console.log('PROBING', providerAddress);

    const brokerMod = await import('@0glabs/0g-serving-broker');
    const anyMod = brokerMod;
    const factory = anyMod.createZGComputeNetworkBroker || anyMod.createBroker || anyMod.createZGNetworkBroker || anyMod.createInferenceBroker || anyMod.createInferenceNetworkBroker;

    const pk = process.env.SERVER_OPERATOR_PRIVATE_KEY || process.env.AGENT_DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
    let broker;
    if(pk){
      const { ethers } = await import('ethers');
      const rpc = process.env.NEXT_PUBLIC_0G_RPC_URL || process.env.OG_RPC_URL || 'https://evmrpc.0g.ai';
      const provider = new ethers.JsonRpcProvider(rpc);
      const wallet = new ethers.Wallet(pk, provider);
      console.log('WALLET', wallet.address);
      if(factory) broker = await factory(wallet);
      else if(anyMod.ServingBroker) broker = new anyMod.ServingBroker({ wallet, url: process.env.OG_COMPUTE_URL, apiKey: process.env.OG_COMPUTE_API_KEY });
      else broker = anyMod;
    } else {
      if(factory) broker = await factory(undefined);
      else if(anyMod.ServingBroker) broker = new anyMod.ServingBroker({ url: process.env.OG_COMPUTE_URL, apiKey: process.env.OG_COMPUTE_API_KEY });
      else broker = anyMod;
    }

    if(!broker) throw new Error('NO_BROKER');

    // Get service metadata
    let meta = null;
    try{ meta = broker.inference && broker.inference.getServiceMetadata ? await broker.inference.getServiceMetadata(providerAddress) : null; }
    catch(e){ console.error('GET_SERVICE_METADATA_ERR', e?.message || e); }
    console.log('METADATA:', JSON.stringify(meta, null, 2));

    // Get request headers
    let headers = null;
    try{ headers = broker.inference && broker.inference.getRequestHeaders ? await broker.inference.getRequestHeaders(providerAddress) : null; }
    catch(e){ console.error('GET_REQUEST_HEADERS_ERR', e?.message || e); }
    console.log('BROKER_HEADERS:', JSON.stringify(headers, null, 2));

    // Query available adapters/endpoints from the broker (if supported)
    try{
      if(broker.inference && broker.inference.listAdapters){
        const adapters = await broker.inference.listAdapters(providerAddress).catch(()=>null);
        console.log('LIST_ADAPTERS:', JSON.stringify(adapters, null, 2));
      }
      if(broker.inference && broker.inference.getAdapterStatus){
        const status = await broker.inference.getAdapterStatus(providerAddress).catch(()=>null);
        console.log('ADAPTER_STATUS:', JSON.stringify(status, null, 2));
      }
    }catch(e){ console.error('ADAPTERS_QUERY_ERR', e?.message || e); }

    const base = (meta && meta.endpoint) ? String(meta.endpoint).replace(/\/$/,'') : (process.env.OG_COMPUTE_URL || '');
    const url = base + '/chat/completions';
    console.log('CALL_URL', url);

    const fetch = globalThis.fetch || (await import('node-fetch')).default;
    const body = {
      model: meta?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a harmless test assistant.' },
        { role: 'user', content: 'ping' }
      ],
      max_tokens: 6
    };
    console.log('REQUEST_BODY', JSON.stringify(body));

    try{
      const attempts = [];
      attempts.push({ url: base + '/chat/completions', body });
      attempts.push({ url: base + '/chat/completions', body: Object.assign({}, body, { stream: false }) });
      attempts.push({ url: base + '/responses', body: { model: body.model, input: 'ping' } });

      for(const attempt of attempts){
        console.log('ATTEMPT_URL', attempt.url);
        console.log('ATTEMPT_BODY', JSON.stringify(attempt.body));
        try{
          const controller = new AbortController();
          const t = setTimeout(()=>controller.abort(), Number(process.env.OG_COMPUTE_TIMEOUT_MS||15000));
          const res = await fetch(attempt.url, { method: 'POST', headers: Object.assign({'Content-Type':'application/json'}, (headers||{})), body: JSON.stringify(attempt.body), signal: controller.signal });
          clearTimeout(t);
          const txt = await res.text().catch(()=>null);
          console.log('PROXY_STATUS', res.status);
          console.log('PROXY_BODY', txt);
          if(res.ok) break;
        }catch(e){
          console.error('PROXY_CALL_ERR', e?.message || e);
        }
      }
    }catch(e){ console.error('PROXY_CALL_ERR', e?.message || e); }

    process.exit(0);

  }catch(err){
    console.error('ERR', err?.stack || err);
    process.exit(1);
  }
})();
