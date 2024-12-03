const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true
}));
app.use(express.json());

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3363,
  user: 'root',
  password: 'root',
  database: 'danci',
  charset: 'utf8mb4'
});

connection.connect(error => {
  if (error) {
    console.error('数据库连接失败:', error.stack);
    return;
  }
  console.log('数据库连接成功');
});

app.post('/api/translations', (req, res) => {
  let { word, translation } = req.body;
  
  word = word.substring(0, 255);
  translation = translation ? translation.substring(0, 255) : null;

  const checkQuery = 'SELECT * FROM translations WHERE word = ? COLLATE utf8mb4_bin';
  
  connection.query(checkQuery, [word], (error, results) => {
    if (error) {
      console.error('查询错误:', error);
      res.status(500).json({ error: '查询失败: ' + error.message });
      return;
    }
    
    if (results.length > 0) {
      const updateQuery = `
        UPDATE translations 
        SET count = count + 1,
            translation = ?
        WHERE word = ? COLLATE utf8mb4_bin
      `;
      
      connection.query(updateQuery, [translation, word], (error) => {
        if (error) {
          console.error('更新错误:', error);
          res.status(500).json({ error: '更新失败: ' + error.message });
          return;
        }
        res.json({ success: true });
      });
    } else {
      const insertQuery = `
        INSERT INTO translations (
          word,
          translation,
          count,
          is_chinese_to_chinese,
          chinese_word_type,
          chinese_translation_type,
          chinese_similarity
        ) VALUES (?, ?, 1, 0, NULL, NULL, 0)
      `;
      
      connection.query(insertQuery, [word, translation], (error, result) => {
        if (error) {
          console.error('插入错误:', error);
          res.status(500).json({ error: '插入失败: ' + error.message });
          return;
        }
        res.json({ success: true });
      });
    }
  });
});

app.get('/api/translations', (req, res) => {
  const query = `
    SELECT 
      id,
      word,
      translation,
      count,
      lasttime,
      is_chinese_to_chinese,
      chinese_word_type,
      chinese_translation_type,
      chinese_similarity
    FROM translations 
    ORDER BY lasttime DESC
  `;
  
  connection.query(query, (error, results) => {
    if (error) {
      console.error('查询错误:', error);
      res.status(500).json({ error: '获取列表失败' });
      return;
    }
    res.json(results);
  });
});

app.delete('/api/translations/:id', (req, res) => {
  const query = 'DELETE FROM translations WHERE id = ?';
  
  connection.query(query, [req.params.id], (error) => {
    if (error) {
      console.error('删除错误:', error);
      res.status(500).json({ error: '删除失败' });
      return;
    }
    res.json({ success: true });
  });
});

app.options('*', cors());

const PORT = 3366;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

process.on('SIGINT', () => {
  connection.end(err => {
    if (err) console.error('关闭连接错误:', err);
    process.exit();
  });
});