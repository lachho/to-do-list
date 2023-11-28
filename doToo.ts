import {
	getData,
	setData,
	Status,
	Score,
	Tag,
	Todo,
	Summary,
	Notification,
	Data,
  ErrorMessage
} from './dataStore'
import HTTPError from 'http-errors';

const clear = (): {} => {
  const data: Data = {
    tags: [],
    todos: [],
    summary: {
      todoItemIds: []
    },
    notifications: []
  };
  setData(data);
  return {};
}

const tagList = (): {tags: Tag[]} => {
  const tags = getData().tags;
  return {tags};
}

const tagInfo = (tagId: number): {name: string} => {
  const index = getTagIndex(tagId);
  if (typeof index === 'object') {
    throw HTTPError(index.code, index.error);
  }
  const name = getData().tags[index].name;
  return {name};
}

const tagDelete = (tagId: number): {} => {
  const index = getTagIndex(tagId);
  if (typeof index === 'object') {
    throw HTTPError(index.code, index.error);
  }
  const data = getData();
  data.tags.splice(index, 1);
  setData(data);
  return {};
}

const tagCreate = (name: string): {tagId: number} => {
  let error = isTagValidLength(name);
  if (error) {
    throw HTTPError(error.code, error.error);
  }
  error = doesTagExist(name);
  if (error) {
    throw HTTPError(error.code, error.error);
  }
  const tagId = getUniqueId();
  const data = getData();
  data.tags.push({tagId, name});
  setData(data);
  return {tagId};
}

const todoInfo = (todoId: number): Todo => {
  const index = getTodoIndex(todoId);
  if (typeof index === 'object') {
    throw HTTPError(index.code, index.error);
  }
  const todo = getData().todos[index];

  return {
    description: todo.description,
    tagIds: todo.tagIds,
    status: todo.status,
    parentId: todo.parentId,
    score: todo.score
  };
}

const todoDelete = (todoId: number) => {
  const index = getTodoIndex(todoId);
  if (typeof index === 'object') {
    throw HTTPError(index.code, index.error);
  }
  
  // remove todo
  const data = getData();
  const removed = data.todos.splice(index, 1);
  setData(data);

  // remove unused tags
  removed[0].tagIds.forEach((tagId: number) => {
    if (!isTagUsed(tagId)) {
      tagDelete(tagId);
    }
  });
  
  // remove related notifs
  const newNotifs = data.notifications.filter((notif: Notification) => notif.todoItemId !== todoId);
  data.notifications = newNotifs;
  setData(data);

  // remove child todos and tags and notifs
  data.todos.forEach(todo =>{
    if (todo.parentId === todoId) {
      todoDelete(todo.todoId);
    }
  });

  return {};
}

const todoCreate = (description: string, parentId: number | null): {todoItemId: number} => {
  let error: any = isTodoValidLength(description);
  if (error) {
    throw HTTPError(error.code, error.error);
  }
  error = getTodoIndex(parentId);
  if (typeof parentId === 'number' && typeof error === 'object') {
    throw HTTPError(error.code, error.error);
  }
  error = doesTodoExist(description, parentId);
  if (error) {
    throw HTTPError(error.code, error.error);
  }
  const count = getData().todos.length;
  if (count >= 50) {
    throw HTTPError(400, 'Already 50 todos generated');
  }
  
  const todoId = getUniqueId();
  const data = getData();
  data.todos.push({
    todoId,
    description,
    tagIds: [],
    status: Status.TODO,
    parentId,
    deadline: null,
    score: Score.NA,
  });
  
  setData(data);
  return {todoItemId: todoId};
}

const todoUpdate = (todoId: number, description: string, tagIds: number[], status: Status, parentId: number | null, deadline: number | null): {} => {
  const index = getTodoIndex(todoId);
  if (typeof index === 'object') {
    throw HTTPError(index.code, index.error);
  }
  let error: any = isTodoValidLength(description);
  if (error) {
    throw HTTPError(error.code, error.error);
  }
  error = getTodoIndex(parentId);
  if (typeof parentId === 'number' && typeof error === 'object') {
    throw HTTPError(error.code, error.error);
  }
  const data = getData();
  error = doesTodoExist(description, parentId);
  if (error && description.toLowerCase() !== data.todos[index].description.toLowerCase()) {
    throw HTTPError(error.code, error.error);
  }
  else if (parentId === todoId) {
    throw HTTPError(400, 'ParentID equals ID to update');
  }
  else if (typeof deadline === 'number' && (deadline <= 0 || deadline >= 10000000000)) {
    throw HTTPError(400, 'deadline is invalid number');
  }
  else if (!Object.values(Status).includes(status as Status)) {
    throw HTTPError(400, 'Status is not valid');
  }
  tagIds.forEach(tagId => {
    error = getTagIndex(tagId);
    if (typeof error === 'object') {
      throw HTTPError(error.code, error.error);
    }
  })
  // Check Cycle
  let next = parentId;
  while (next !== null) {
    next = data.todos[getTodoIndex(next) as number].parentId;
    if (next === todoId) {
      throw HTTPError(400, 'cycle created');
    }
  }
  
  // adds a notifcation
  if (data.todos[index].status !== status) {
    data.notifications.push({
      todoItemId: todoId,
      todoItemDescription: description, 
      statusBefore: data.todos[index].status,
      statusAfter: status,
      statusChangeTimestamp: getTime()
    });
  }

  // updates existing notifs with new description
  data.notifications.forEach((notif: Notification) => {
    if (notif.todoItemId === todoId) {
      notif.todoItemDescription = description;
    }
  })

  // if marked as DONE, calculate score and add to summary page
  let score = Score.NA;
  if (status === Status.DONE) {
    if (deadline === null) {
      score = Score.HIGH;
    }
    else if (getTime() <= deadline) {
      score = Score.HIGH;
    } else {
      score = Score.LOW;
    }
    data.summary.todoItemIds.unshift(todoId);
  }
  
  const oldTags = data.todos[index].tagIds;

  data.todos[index] = {
    todoId,
    description,
    tagIds,
    status,
    parentId,
    deadline,
    score
  };
  setData(data);

  // check if old tags should be removed:
  oldTags.forEach(tagId => {
    if (!isTagUsed(tagId)) {
      tagDelete(tagId);
    }
  });
  setData(data);
  
  return {};
}

const todoList = (parentId: number | null, tagIds: number[] | null, status: string | null): {todoItems: Todo[]} => {
  if (status !== null && !Object.values(Status).includes(status as Status)) {
      throw HTTPError(400, 'Status is not valid');
  }
  else if (tagIds !== null) {
    if (tagIds.length === 0) {
      throw HTTPError(400, 'Tag ID list is empty');
    } else {
      tagIds.forEach(tagId => {
        const error = getTagIndex(tagId);
        if (typeof error === 'object') {
          throw HTTPError(error.code, error.error);
        }
      })
    }
  }
  const index = getTodoIndex(parentId);
  if (typeof parentId === 'number' && typeof index === 'object') {
    throw HTTPError(index.code, index.error);
  }

  const filtered = getData().todos.filter(todo => {
    return (
      (todo.parentId === parentId) &&
      (tagIds === null || todo.tagIds.some(tag => tagIds.includes(tag))) &&
      (status === null || todo.status === status)
    );
  });

  const todoItems: Todo[] = [];
  filtered.forEach(todo => {
    todoItems.push(todoInfo(todo.todoId));
  })

  return {todoItems};  
}

const todoBulk = (string: string): Summary => {
  const todoItemIds: number[] = [];
  const todos: Array<{description: string, parentId: number, tagNames: string[], status: Status}> = [];
  const items = string.split('|');

  items.forEach(todo => {
    const info = todo.split(';').map(string => string.trim());
    if (info.length === 3) {
      info.splice(1, 0, 'null');
    }
    const description = info[0];
    let parentId: any = info[1];
    if (info[1] === 'null' || info[1] === '') {
      parentId = null;
    } else {
      parentId = parseInt(parentId as string);
    }
    let status = info[2] as Status;
    let tagNames = info[3].split(',').map(string => string.trim());
    if (tagNames.length === 1 && tagNames[0] === '') {
      tagNames = [];
    }
      
    let error: any = isTodoValidLength(description);
    if (error) {
      throw HTTPError(error.code, error.error);
    }
    error = getTodoIndex(parentId);
    if (typeof parentId === 'number' && typeof error === 'object') {
      throw HTTPError(error.code, error.error);
    }
    error = doesTodoExist(description, parentId);
    if (error) {
      throw HTTPError(error.code, error.error);
    }
    tagNames.forEach((tag: string) => {
      error = isTagValidLength(tag);
      if (error) {
        throw HTTPError(error.code, error.error);
      }
    });
    if (!Object.values(Status).includes(status as Status)) {
      throw HTTPError(400, 'Status is not valid');
    }
    todos.push({description, parentId, tagNames, status});
  });

  if (getData().todos.length + todos.length >= 50) {
    throw HTTPError(400, '50 todos generated');
  }

  const data = getData();
  todos.forEach(todo => {
    const todoId = getUniqueId();
    const tagIds = todo.tagNames.map((tag: string) => {
      let tagId = getTagIdFromName(tag);
      if (typeof tagId === 'object') {
        tagId = tagCreate(tag).tagId;
      }
      return tagId;
    });

    let score: Score = Score.NA;
    if (todo.status === Status.DONE) {
      score = Score.HIGH;
    }

    data.todos.push({
      todoId,
      description: todo.description,
      tagIds,
      status: todo.status,
      parentId: todo.parentId,
      deadline: null,
      score,
    });

    todoItemIds.push(todoId);
  });
  
  setData(data);
  return {todoItemIds};
}

const summary = (step: number | null): Summary => {
  if (![null, 1, 2, 3, 4].includes(step)) {
    throw HTTPError(400, 'Step is invalid');
  }
  if (step === null) {
    step = 0;
  }
  const start = step * 10;
  const end = start + 10;

  return {todoItemIds: getData().summary.todoItemIds.slice(start, end)};
}

const notifications = () => {
  return {notifications: getData().notifications};
}

const getTagIndex = (tagId: number): number | ErrorMessage => {
  const tags = getData().tags;
  const index = tags.findIndex(tag => tag.tagId === tagId);
  if (index >= 0) {
    return index;
  } else {
    return { error: 'Tag not found', code: 400 };
  }
}

const doesTagExist = (name: string): ErrorMessage => {
  const tags = getData().tags
  const index = tags.findIndex(tag => tag.name.toLowerCase() === name.toLowerCase());
  if (index >= 0) {
    return { error: 'Tag name already exists', code: 400 };
  }
}

const getTagIdFromName = (name: string): number | ErrorMessage => {
  const tags = getData().tags;
  const index = tags.findIndex(tag => tag.name.toLowerCase() === name.toLowerCase());
  if (index >= 0) {
    return tags[index].tagId;
  } else {
    return { error: 'Tag not found', code: 400 };
  }
}

const isTagUsed = (tagId: number): boolean => {
  const todos = getData().todos;
  for (const todo of todos) {
    if (todo.tagIds.includes(tagId)) {
      return true;
    }
  }

  return false;
}

const getTodoIndex = (todoId: number): number | ErrorMessage => {
  const todos = getData().todos;
  const index = todos.findIndex(todo => todo.todoId === todoId);
  if (index >= 0) {
    return index;
  } else {
    return { error: 'Todo not found', code: 400 };
  }
}

const doesTodoExist = (description: string, parentId: number): ErrorMessage => {
  const todos = getData().todos
  const index = todos.findIndex(todo => 
    todo.description.toLowerCase() === description.toLowerCase() && 
    todo.parentId === parentId
  );
  if (index >= 0) {
    return { error: 'Todo description already exists', code: 400 };
  }
}

const getUniqueId = (): number => Math.floor(Math.random() * 10000000);
const getTime = (): number => Math.floor(Date.now() / 1000);

const isTagValidLength = (tag: string): ErrorMessage => {
  if (tag.length < 1 || tag.length > 10) {
    return {error: 'Tag length invalid', code: 400};
  }
}

const isTodoValidLength = (todo: string): ErrorMessage => {
  if (todo.length < 1) {
    return {error: 'Todo length invalid', code: 400};
  }
}

export {
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
}