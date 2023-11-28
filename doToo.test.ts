import { port, url } from './config.json';
import request, { HttpVerb } from 'sync-request';
import HTTPError from 'http-errors';

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 100000;

let todoId: number;
let todoId2: number;
let tagId1: number;
let tagId2: number;

// Helpers - adapted from lab8 quiz
const requestHelper = (method: HttpVerb, path: string, payload: any): any => {
  let qs = {};
  let json = {};
  if (['GET', 'DELETE'].includes(method.toUpperCase())) {
    qs = payload;
  } else {
    // PUT/POST
    json = payload;
  }

  const url = SERVER_URL + path;
  const res = request(method, url, { qs, json, timeout: TIMEOUT_MS });;
  let responseBody;
  try {
    responseBody = JSON.parse(res.body.toString());
  } catch (err: any) {
    if (res.statusCode === 200) {
      throw HTTPError(500,
        `Non-jsonifiable body despite code 200: '${res.body}'.\nCheck the server log`
      );
    }
    responseBody = { error: `Failed to parse JSON: '${err.message}'` };
  }

  const errorMessage = `[${res.statusCode}] ` + responseBody?.error || responseBody || 'Error not found!';

  if (res.statusCode !== 200) {
    throw HTTPError(res.statusCode, errorMessage);
  }
  return responseBody;
};

const clear = () =>  {
  return requestHelper('DELETE', '/clear', {});
};

const tagCreate = (name: string) => {
  return requestHelper('POST', '/tag', {name});
};

const tagInfo = (tagId: number) => {
  return requestHelper('GET', '/tag', {tagId});
};

const tagList = () => {
  return requestHelper('GET', '/tag/list', {});
};

const tagDelete = (tagId: number) => {
  return requestHelper('DELETE', '/tag', {tagId});
};

const todoCreate = (description: string, parentId: number) => {
  return requestHelper('POST', '/todo/item', {description, parentId});
};

const todoInfo = (todoItemId: number) => {
  return requestHelper('GET', '/todo/item', {todoItemId});
};

const todoList = (parentIdnum: number, tagIdsArray: number[], statusString: string | null) => {
  const tagIds = JSON.stringify(tagIdsArray);
  const parentId = JSON.stringify(parentIdnum);
  const status = JSON.stringify(statusString);
  return requestHelper('GET', '/todo/list', {parentId, tagIds, status});
};

const todoDelete = (todoItemId: number) => {
  return requestHelper('DELETE', '/todo/item', {todoItemId});
};

const todoUpdate = (todoItemId: number, description: string, tagIds: number[], status: string | null, parentId: number, deadline: number) => {
  return requestHelper('PUT', '/todo/item', {todoItemId, description, tagIds, status, parentId, deadline});
};

const summary = (stepNum: number | null) => {
  const step = JSON.stringify(stepNum);
  return requestHelper('GET', '/summary', {step});
};

const notifications = () => {
  return requestHelper('GET', '/notifications', {});
};

const todoBulk = (bulkString: string) => {
  return requestHelper('POST', '/todo/item/bulk', {bulkString});
};

beforeEach(() => {
  clear();
});

test('clear', () => {
  tagCreate('Snoop');
  expect(clear()).toStrictEqual({});
  expect(tagList()).toStrictEqual({tags: []});
});

describe('tagCreate', () => {
  test('success', () => {
    expect(tagCreate('Snoop')).toStrictEqual({tagId: expect.any(Number)});
  });
  test('too short name', () => {
    expect(() => tagCreate('')).toThrow(HTTPError[400]);
  });
  test('too long name', () => {
    expect(() => tagCreate('Gangnam Style')).toThrow(HTTPError[400]);
  });
  test('tag already exists', () => {
    tagCreate('Snoop');
    expect(() => tagCreate('Snoop')).toThrow(HTTPError[400]);
  });
});

describe('tagInfo', () => {
  test('success', () => {
    const tagId = tagCreate('Snoop').tagId;
    expect(tagInfo(tagId)).toStrictEqual({name: 'Snoop'});
  });
  test('ID doesnt exist', () => {
    expect(() => tagInfo(NaN)).toThrow(HTTPError[400]);
  });
});

test('tagList', () => {
  const tagId1 = tagCreate('Snoop').tagId;
  const tagId2 = tagCreate('Ye').tagId;
  expect(tagList()).toStrictEqual({tags: [
    {name: 'Snoop', tagId: tagId1},
    {name: 'Ye', tagId: tagId2}
  ]});
});

describe('tagDelete', () => {
  test('success', () => {
    const tagId = tagCreate('Snoop').tagId;
    expect(tagDelete(tagId)).toStrictEqual({});
    expect(tagList()).toStrictEqual({tags: []});
  });
  test('ID doesnt exist', () => {
    const tagId = tagCreate('Snoop').tagId;
    tagDelete(tagId);
    expect(() => tagDelete(tagId)).toThrow(HTTPError[400]);
  });
});

describe('todoCreate', () => {
  test('success', () => {
    expect(todoCreate('Wow', null)).toStrictEqual({todoItemId: expect.any(Number)});
  });
  test('too short name', () => {
    expect(() => todoCreate('', null)).toThrow(HTTPError[400]);
  });
  test('parent ID invalid', () => {
    expect(() => todoCreate('Wow', 1)).toThrow(HTTPError[400]);
  });
  test('too many todos', () => {
    for (let i = 0; i < 50; i++) {
      todoCreate(`Wow ${i}`, null);
    }
    expect(() => todoCreate('Wow', null)).toThrow(HTTPError[400]);
  });
  test('todo already exists', () => {
    todoCreate('Wow', null);
    expect(() => todoCreate('Wow', null)).toThrow(HTTPError[400]);
  });
});

describe('todoInfo', () => {
  test('success', () => {
    const todoId = todoCreate('Wow', null).todoItemId;
    expect(todoInfo(todoId)).toStrictEqual({
      description: 'Wow',
      tagIds: [],
      status: 'TODO',
      parentId: null,
      score: 'NA'
    });
  });
  test('ID doesnt exist', () => {
    expect(() => todoInfo(NaN)).toThrow(HTTPError[400]);
  });
});

describe('todoUpdate', () => {
  beforeEach(() => {
    todoId = todoCreate('Wow', null).todoItemId;
    todoId2 = todoCreate('Waluigi', null).todoItemId;
    tagId1 = tagCreate('Snoop').tagId;
    tagId2 = tagCreate('Ye').tagId;
  });
  test('success', () => {
    todoUpdate(todoId, 'Lol', [tagId1, tagId2], 'INPROGRESS', todoId2, Math.floor(Date.now() / 1000));
    expect(todoUpdate(todoId, 'Lol', [tagId1], 'INPROGRESS', todoId2, Math.floor(Date.now() / 1000))).toStrictEqual({});
    expect(todoInfo(todoId)).toStrictEqual({
      description: 'Lol',
      tagIds: [tagId1],
      status: 'INPROGRESS',
      parentId: todoId2,
      score: 'NA'
    });
  });
  test('ID doesnt exist', () => {
    expect(() => todoUpdate(1, 'Lol', [tagId1, tagId2], 'INPROGRESS', todoId2, Math.floor(Date.now() / 1000))).toThrow(HTTPError[400]);
  });
  test('description is invalid', () => {
    expect(() => todoUpdate(todoId, '', [tagId1, tagId2], 'INPROGRESS', todoId2, Math.floor(Date.now() / 1000))).toThrow(HTTPError[400]);
  });
  test('description is already used', () => {
    expect(() => todoUpdate(todoId, 'Waluigi', [tagId1, tagId2], 'INPROGRESS', null, Math.floor(Date.now() / 1000))).toThrow(HTTPError[400]);
  });
  test('status is invalid', () => {
    expect(() => todoUpdate(todoId, 'Lol', [tagId1, tagId2], 'LOL', todoId2, Math.floor(Date.now() / 1000))).toThrow(HTTPError[400]);
  })
  test('tagIds is invalid', () => {
    expect(() => todoUpdate(todoId, 'Lol', [tagId1, 1], 'INPROGRESS', todoId2, Math.floor(Date.now() / 1000))).toThrow(HTTPError[400]);
  })
  test('parent ID is itself', () => {
    expect(() => todoUpdate(todoId, 'Lol', [tagId1, tagId2], 'INPROGRESS', todoId, Math.floor(Date.now() / 1000))).toThrow(HTTPError[400]);
  })
  test('parent ID is invalid', () => {
    expect(() => todoUpdate(todoId, 'Lol', [tagId1, tagId2], 'INPROGRESS', 1, Math.floor(Date.now() / 1000))).toThrow(HTTPError[400]);
  })
  test('parent ID will cycle', () => {
    todoUpdate(todoId2, 'Cycle time', [], 'INPROGRESS', todoId, Math.floor(Date.now() / 1000));
    expect(() => todoUpdate(todoId, 'Lol', [tagId1, tagId2], 'INPROGRESS', todoId2, Math.floor(Date.now() / 1000))).toThrow(HTTPError[400]);
  })
  test('deadline is invalid', () => {
    expect(() => todoUpdate(todoId, 'Lol', [tagId1, tagId2], 'INPROGRESS', todoId2, -1)).toThrow(HTTPError[400]);
  })
});

describe('todoDelete', () => {
  test('success', () => {
    const tagId1 = tagCreate('Snoop').tagId;
    const tagId2 = tagCreate('Ye').tagId;
    const todoId = todoCreate('Wow', null).todoItemId;
    const todoId2 = todoCreate('Waluigi', null).todoItemId;
    const todoId3 = todoCreate('Wicked Wings', todoId).todoItemId;
    todoUpdate(todoId3, 'waluiGI', [tagId1, tagId2], 'INPROGRESS', todoId, Math.floor(Date.now() / 1000));
    todoUpdate(todoId2, 'Nuggies', [tagId1], 'INPROGRESS', null, Math.floor(Date.now() / 1000));
    expect(todoDelete(todoId)).toStrictEqual({});
    expect(todoList(null, null, null).todoItems.length).toStrictEqual(1);
  });
  test('ID doesnt exist', () => {
    const todoId = todoCreate('Wow', null).todoItemId;
    todoDelete(todoId);
    expect(() => todoDelete(todoId)).toThrow(HTTPError[400]);
  });
});

describe('todoList', () => {
  test('success - filter empty', () => {
    const todoId = todoCreate('Wow', null).todoItemId;
    const tagId1 = tagCreate('yeet').tagId;
    todoCreate('one', todoId);
    todoCreate('two', todoId);
    todoCreate('three', null);
    todoUpdate(todoId, 'he heee', [tagId1], 'TODO', null, null);
    expect(todoList(null, [tagId1], 'TODO').todoItems.length).toStrictEqual(1);
  });
  test('success - all', () => {
    const todoId = todoCreate('Wow', null).todoItemId;
    const tagId1 = tagCreate('yeet').tagId;
    todoCreate('one', todoId);
    todoCreate('two', todoId);
    todoCreate('three', todoId);
    expect(todoList(todoId, null, 'TODO').todoItems.length).toStrictEqual(3);
  });
  test('status invalid', () => {
    const todoId = todoCreate('Wow', null).todoItemId;
    const tagId1 = tagCreate('yeet');
    expect(() => todoList(todoId, [tagId1], 'LOL')).toThrow(HTTPError[400]);
  });
  test('tagId is an empty list', () => {
    const todoId = todoCreate('Wow', null).todoItemId;
    expect(() => todoList(todoId, [], 'TODO')).toThrow(HTTPError[400]);
  });
  test('tagId is invalid', () => {
    const todoId = todoCreate('Wow', null).todoItemId;
    expect(() => todoList(todoId, [1], 'TODO')).toThrow(HTTPError[400]);
  });
  test('parent Id is invalid', () => {
    const todoId = todoCreate('Wow', null).todoItemId;
    const tagId1 = tagCreate('yeet').tagId;
    expect(() => todoList(1, [tagId1], 'TODO')).toThrow(HTTPError[400]);
  });
});

describe('summary', () => {
  test('success', () => {
    const tagId1 = tagCreate('Snoop').tagId;
    const tagId2 = tagCreate('Ye').tagId;
    const todoId = todoCreate('Wow', null).todoItemId;
    const todoId2 = todoCreate('Waluigi', null).todoItemId;
    const todoId3 = todoCreate('Wicked Wings', todoId).todoItemId;
    todoUpdate(todoId3, 'waluiGI', [tagId1, tagId2], 'DONE', todoId, Math.floor(Date.now() / 1000) + 5);
    todoUpdate(todoId, 'The Chat', [], 'DONE', null, null);
    todoUpdate(todoId2, 'Nuggies', [tagId1], 'DONE', null, Math.floor(Date.now() / 1000) - 5);
    expect(summary(null)).toStrictEqual({todoItemIds: [todoId2, todoId, todoId3]});
  });
  test('empty success', () => {
    const todoId = todoCreate('Wow', null).todoItemId;
    expect(summary(1)).toStrictEqual({todoItemIds: []});
  });
  test('step is invalid', () => {
    const todoId = todoCreate('Wow', null).todoItemId;
    expect(() => summary(7)).toThrow(HTTPError[400]);
  });
});

describe('notifications', () => {
  test('success', () => {
    const tagId1 = tagCreate('Snoop').tagId;
    const tagId2 = tagCreate('Ye').tagId;
    const todoId = todoCreate('Wow', null).todoItemId;
    const todoId2 = todoCreate('Waluigi', null).todoItemId;
    const todoId3 = todoCreate('Wicked Wings', todoId).todoItemId;
    todoUpdate(todoId3, 'waluiGI', [tagId1, tagId2], 'INPROGRESS', todoId, Math.floor(Date.now() / 1000));
    todoUpdate(todoId2, 'Nuggies', [tagId1], 'INPROGRESS', null, Math.floor(Date.now() / 1000));
    expect(notifications().notifications.length).toStrictEqual(2);
    todoDelete(todoId);
    expect(notifications().notifications.length).toStrictEqual(1);
  });
});

describe('todoBulk', () => {
  beforeEach(() => {
    todoId = todoCreate('Wow', null).todoItemId;
    todoId2 = todoCreate('Waluigi', null).todoItemId;
    tagId1 = tagCreate('Snoop').tagId;
    tagId2 = tagCreate('Ye').tagId;
  });
  test.each([
    [" Bulk ; null; TODO ; arms, legs, back | Cutting; null; INPROGRESS ; back, legs"],
    [" Bulk ; DONE ;"],
    [" Bulk; ; TODO ;"],
    [" Bulk ; TODO ; arms, legs, Snoop"],
  ])('success %s', (bulkString) => {
    expect(todoBulk(bulkString)).toStrictEqual({todoItemIds: expect.any(Array)});
  })
  test('success - non-null parent ID', () => {
    expect(todoBulk(` Bulk; ; TODO; | Bulk; ${todoId} ; INPROGRESS ; | A nom; ${todoId2} ; TODO; arms`)).toStrictEqual({todoItemIds: expect.any(Array)});
  });
  test('too many Todos', () => {
    let bulkString = 'Start;TODO;'
    for (let i = 0; i < 48; i++) {
      bulkString += `| Wow ${i};TODO;`;
    }
    expect(() => todoBulk(bulkString)).toThrow(HTTPError[400]);
  });
  test('Status Invalid', () => {
    expect(() => todoBulk(` Bulk; TO; `)).toThrow(HTTPError[400]);
  });
  test('Tag Invalid', () => {
    expect(() => todoBulk(` Bulk; TO; , hi,  `)).toThrow(HTTPError[400]);
  });
  test('Description already used', () => {
    expect(() => todoBulk(` Wow; TODO; `)).toThrow(HTTPError[400]);
  });
  test('Parent ID Invalid', () => {
    expect(() => todoBulk(` Bulk;1; TODO; `)).toThrow(HTTPError[400]);
  });
  test('Description invalid', () => {
    expect(() => todoBulk(`; TODO; `)).toThrow(HTTPError[400]);
  });
});