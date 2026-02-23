const client = new StreamerbotClient({
	host: "127.0.0.1",
	port: 8080,
	endpoint: "/",
	onConnect: onConnect,
	onDisconnect: onDisconnect,
	onError: onError,
});

client.on("General.Custom", (data) => onCustom(data));

let taskList;

function onDisconnect() {
	showConnectionError("Connection Failed: Unable to connect to Streamer.bot");
}

function onError(err) {
	showConnectionError(
		"Connection Failed: " + (err?.message || "Unknown error"),
	);
}

function showConnectionError(message) {
	// Remove existing popup if any
	const existing = document.getElementById("connection-error");
	if (existing) existing.remove();

	const popup = document.createElement("div");
	popup.id = "connection-error";
	popup.textContent = message;
	Object.assign(popup.style, {
		position: "fixed",
		top: "20px",
		left: "50%",
		transform: "translateX(-50%)",
		background: "#e53935",
		color: "#fff",
		padding: "12px 24px",
		borderRadius: "8px",
		fontFamily: "'Fredoka', sans-serif",
		fontSize: "1.1rem",
		fontWeight: "700",
		zIndex: "9999",
		boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
		textAlign: "center",
	});
	document.body.appendChild(popup);

	// Auto-dismiss after 5 seconds
	setTimeout(() => {
		popup.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: 300,
			fill: "forwards",
		}).onfinish = () => popup.remove();
	}, 5000);
}

async function refresh() {
	const response = await client.getGlobal("rython-task-bot", true);
	console.log(response);

	if (response.status !== "ok" || !response.variable?.value) return;

	const users = JSON.parse(response.variable.value);
	const sections = transformToSections(users);

	taskList.load(sections);
}

// LOAD TASK LIST
async function onConnect() {
	refresh();
	// TaskList from view.js
	taskList = new TaskList(".task-panel");
	taskList.load(sections);
}

function transformToSections(users) {
	return Object.entries(users).map(([userId, userData]) => ({
		id: userId,
		title: userData.username,
		tasks: userData.tasks.map((task) => ({
			text: task.Name,
			done: task.Completed,
			focused: task.Focused,
		})),
	}));
}

// Update task list action by action
function onCustom(payload) {
	const data = payload.data;
	if (!data.source && !data.source === "rython-task-bot") {
		return;
	}
	if (!taskList) return;
	const body = data.body;
	const id = data.id;
	const username = data.username;

	switch (body.mode) {
		case "add":
			// body.task;
			taskList.addTask(
				id,
				{
					text: body.task,
					done: body.completed,
					focused: body.focused,
				},
				username,
			);
			break;
		case "focus":
			taskList.focusTask(id, body.index);
			break;
		case "edit":
			taskList.editTask(id, body.index, body.task);
			break;
		case "remove":
			taskList.removeTask(id, body.index);
			break;
		case "done":
			taskList.doneTask(id, body.index);
			break;
		case "clearns":
			refresh();
			break;
		case "cleardone":
			taskList.cleardone();
			break;
		case "clearmydone":
			taskList.clearmydone(id);
			break;
		case "clearall":
			refresh();
			break;
		case "undone":
			taskList.undoneTask(id, body.index);
			break;
		case "unfocus":
			taskList.unfocusTask(id);
			break;
		case "admindelete":
			taskList.removeSection(body.id);
			break;
		default:
			break;
	}
}
