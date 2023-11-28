import express, { json, Request, Response } from 'express';
import morgan from 'morgan';
import config from './config.json';
import cors from 'cors';
import errorHandler from 'middleware-http-errors';
import {
  clear,
  tagList,
  tagInfo,
  tagDelete,
  tagCreate,
  todoInfo,
  todoDelete,
  todoCreate,
  todoUpdate,
  todoList,
  todoBulk,
  summary,
  notifications
} from './doToo';

// Set up web app
const app = express();
// Use middleware that allows us to access the JSON body of requests
app.use(json());
// Use middleware that allows for access from other domains
app.use(cors());

const PORT: number = parseInt(process.env.PORT || config.port);
const HOST: string = process.env.IP || 'localhost';

// for logging errors (print to terminal)
app.use(morgan('dev'));

// ====================================================================
//  ================= WORK IS DONE BELOW THIS LINE ===================
// ====================================================================

app.delete('/clear', (req: Request, res: Response) => {
  res.json(clear());
});

app.post('/tag', (req: Request, res: Response) => {
  const {name} = req.body
  res.json(tagCreate(name));
});


app.get('/tag', (req: Request, res: Response) => {
  const tagId = parseInt(req.query.tagId as string);
  console.log('server state:', req.query.tagId);
  res.json(tagInfo(tagId));
});


app.get('/tag/list', (req: Request, res: Response) => {
  res.json(tagList());
});


app.delete('/tag', (req: Request, res: Response) => {
  const tagId = parseInt(req.query.tagId as string);
  res.json(tagDelete(tagId));
});

app.post('/todo/item', (req: Request, res: Response) => {
  const {description, parentId} = req.body;
  res.json(todoCreate(description, parentId));
});


app.get('/todo/item', (req: Request, res: Response) => {
  const todoId = parseInt(req.query.todoItemId as string);
  res.json(todoInfo(todoId));
});


app.get('/todo/list', (req: Request, res: Response) => {
  let tagIds: any = req.query.tagIds as string;
  if (tagIds === 'null') {
    tagIds = null;
  } else {
    tagIds = JSON.parse(tagIds);
  }
  let parentId: any = req.query.parentId as string;
  if (parentId === 'null') {
    parentId = null;
  } else {
    parentId = parseInt(parentId);
  }
  let status = req.query.status as string;
  if (status === 'null') {
    status = null;
  } else {
    status = JSON.parse(status);
  }
  
  res.json(todoList(parentId, tagIds, status));
});

app.delete('/todo/item', (req: Request, res: Response) => {
  const todoId = parseInt(req.query.todoItemId as string);
  res.json(todoDelete(todoId));
});


app.put('/todo/item', (req: Request, res: Response) => {
  const {todoItemId, description, tagIds, status, parentId, deadline} = req.body;
  res.json(todoUpdate(todoItemId, description, tagIds, status, parentId, deadline));
});


app.get('/summary', (req: Request, res: Response) => {
  
  let step: any = req.query.step as string;
  console.log(step);
  if (step === 'null') {
    step = null;
  } else {
    step = parseInt(step);
  }
  res.json(summary(step));
});


app.get('/notifications', (req: Request, res: Response) => {
  res.json(notifications());
});


app.post('/todo/item/bulk', (req: Request, res: Response) => {
  const {bulkString} = req.body;
  res.json(todoBulk(bulkString));
});

// ====================================================================
//  ================= WORK IS DONE ABOVE THIS LINE ===================
// ====================================================================

// For handling errors
app.use(errorHandler());

// start server
const server = app.listen(PORT, HOST, () => {
  // DO NOT CHANGE THIS LINE
  console.log(`⚡️ Server started on port ${PORT} at ${HOST}`);
});

// For coverage, handle Ctrl+C gracefully
process.on('SIGINT', () => {
  server.close(() => console.log('Shutting down server gracefully.'));
});
