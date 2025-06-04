/**
 * Utilitários para validação de CPF e CNPJ no backend
 */

// Remove todos os caracteres não numéricos
const cleanDocument = (document) => {
  return document.replace(/\D/g, '');
};

// Valida CPF
const isValidCPF = (cpf) => {
  const cleaned = cleanDocument(cpf);
  
  if (cleaned.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  // Calcula primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) firstDigit = 0;
  
  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) secondDigit = 0;
  
  // Verifica se os dígitos calculados coincidem com os informados
  return (
    parseInt(cleaned.charAt(9)) === firstDigit &&
    parseInt(cleaned.charAt(10)) === secondDigit
  );
};

// Valida CNPJ
const isValidCNPJ = (cnpj) => {
  const cleaned = cleanDocument(cnpj);
  
  if (cleaned.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  // Calcula primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights1[i];
  }
  let firstDigit = sum % 11;
  firstDigit = firstDigit < 2 ? 0 : 11 - firstDigit;
  
  // Calcula segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights2[i];
  }
  let secondDigit = sum % 11;
  secondDigit = secondDigit < 2 ? 0 : 11 - secondDigit;
  
  // Verifica se os dígitos calculados coincidem com os informados
  return (
    parseInt(cleaned.charAt(12)) === firstDigit &&
    parseInt(cleaned.charAt(13)) === secondDigit
  );
};

// Valida se é CPF ou CNPJ válido
const isValidDocument = (document) => {
  const cleaned = cleanDocument(document);
  
  if (cleaned.length === 11) {
    return isValidCPF(document);
  } else if (cleaned.length === 14) {
    return isValidCNPJ(document);
  }
  
  return false;
};

// Determina o tipo do documento
const getDocumentType = (document) => {
  const cleaned = cleanDocument(document);
  
  if (cleaned.length === 11) {
    return isValidCPF(document) ? 'cpf' : 'invalid';
  } else if (cleaned.length === 14) {
    return isValidCNPJ(document) ? 'cnpj' : 'invalid';
  }
  
  return 'invalid';
};

module.exports = {
  cleanDocument,
  isValidCPF,
  isValidCNPJ,
  isValidDocument,
  getDocumentType
}; 