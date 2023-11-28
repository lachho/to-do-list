interface ErrorMessage {
  error: string;
  code: number;
}

enum Status {
  TODO = 'TODO',
  INPROGRESS = 'INPROGRESS',
  BLOCKED = 'BLOCKED',
  DONE = 'DONE'
}

enum Score {
  NA = 'NA',
  LOW = 'LOW',
  HIGH = 'HIGH'
}

interface Tag {
  tagId: number,
  name: string,
}

interface Todo {
  todoId?: number,
  description: string,
  tagIds: number[],
  status: Status,
  parentId: number | null,
  deadline?: number | null,
  score?: Score,
}

interface Summary {
	todoItemIds: number[]
}

interface Notification {
	todoItemId: number,
	todoItemDescription: string,
	statusBefore: Status,
	statusAfter: Status,
	statusChangeTimestamp: number
}

interface Data {
  tags: Tag[],
  todos: Todo[],
  summary: Summary
  notifications: Notification[]
}

let data: Data = {
	tags: [],
	todos: [],
	summary: {
		todoItemIds: []
	},
	notifications: []
};

const getData = (): Data => {
	return data;
}

const setData = (newData: Data) => {
  data = newData;
	return {};
}

export {
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
}