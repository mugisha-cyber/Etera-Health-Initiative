const fs = require('fs');
const path = require('path');

const contentPath = path.join(__dirname, '..', 'config', 'dashboardContent.json');

const defaultContent = {
  title: 'Member Updates',
  message: 'Stay informed with the latest ETERA program updates and resources.'
};

const readContent = () => {
  try {
    if (!fs.existsSync(contentPath)) {
      return defaultContent;
    }
    const raw = fs.readFileSync(contentPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      title: parsed.title || defaultContent.title,
      message: parsed.message || defaultContent.message
    };
  } catch (error) {
    return defaultContent;
  }
};

const writeContent = (content) => {
  const payload = {
    title: content.title || defaultContent.title,
    message: content.message || defaultContent.message
  };
  fs.writeFileSync(contentPath, JSON.stringify(payload, null, 2));
  return payload;
};

exports.getDashboardContent = (req, res) => {
  const content = readContent();
  return res.json(content);
};

exports.updateDashboardContent = (req, res) => {
  const { title, message } = req.body || {};

  if (!title || !message) {
    return res.status(400).json({ message: 'Title and message are required.' });
  }

  const updated = writeContent({ title, message });
  return res.json({ message: 'Dashboard content updated', content: updated });
};
