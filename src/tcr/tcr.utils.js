const crypto = require('crypto');

class TcrUtils {
  // Função para construir query string
  static buildQuery(obj, prefix) {
    let str = [];
    for (let p in obj) {
      if (obj.hasOwnProperty(p)) {
        let k = prefix ? `${prefix}[${p}]` : p;
        let v = obj[p];
        str.push(
          v !== null && typeof v === "object"
            ? TcrUtils.buildQuery(v, k)
            : encodeURIComponent(k) + "=" + encodeURIComponent(v)
        );
      }
    }
    return str.join("&");
  }

  // Função para gerar assinatura
  static generateSignature(body, queryParams, apiSecret) {
    const combinedData = { ...body, ...queryParams };
    delete combinedData.signature; // Remove assinatura existente
    const queryString = TcrUtils.buildQuery(combinedData); // Transforma em query string
    const hash = crypto.createHmac('sha512', apiSecret).update(queryString).digest('hex'); // Gera HMAC-SHA512
    return hash;
  }
}

module.exports = TcrUtils;
