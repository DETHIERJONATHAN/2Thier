#!/usr/bin/env node
const url = process.env.DATABASE_URL || '';
const masked = url
  .replace(/(postgresql:\/\/)([^:@/]+)(:)([^@/]+)(@)/i, (_m, p1, user, p3, pass, p5) => `${p1}${user}${p3}***${p5}`)
  .replace(/(password=)([^&]+)/i, (_m, p1) => `${p1}***`);
console.log('DATABASE_URL:', masked || '(non défini)');
