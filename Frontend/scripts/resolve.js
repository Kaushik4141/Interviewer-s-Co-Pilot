const fs = require('fs');

const files = [
  'components/VideoStack.tsx',
  'components/RightPanel.tsx',
  'components/Lobby.tsx',
  'components/InterviewDashboard.tsx',
  'components/CandidateDashboard.tsx',
  'app/interviewer/page.tsx',
  'app/candidate/page.tsx'
];

for (const file of files) {
  const fullPath = require('path').join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    const regex = /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n[\s\S]*?>>>>>>> 95535ce4d0d6f9d6bbd465dc08a2173caee37eb4\r?\n?/g;
    content = content.replace(regex, '$1');
    fs.writeFileSync(fullPath, content);
    console.log(`Resolved: ${file}`);
  }
}
