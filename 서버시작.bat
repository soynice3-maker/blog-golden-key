@echo off
start "크롤러" cmd /k "cd /d C:\Users\soyi\blog-golden-key\crawler && node index.js"
start "Next.js" cmd /k "cd /d C:\Users\soyi\blog-golden-key && npm run dev"
