import type { Config } from 'tailwindcss';
const config: Config={content:['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],theme:{extend:{colors:{ink:'#16151d',muted:'#74717e',panel:'#ffffff',soft:'#f7f6fa',purple:'#6c5ce7',lavender:'#eeeaff',border:'#e9e7ef'}}},plugins:[]};
export default config;
