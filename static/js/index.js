// Constants
// Define how many markins in the row are needed
const needed_count = 5;
// Define how many free spaces there should be
const free_at_least = 3;
// Checking table defined by x and y slope pairs
const check_table = [[1, 0], [0, 1], [1, 1], [1, -1]]
// Should the board be expanding or not
const expanding = false;
// How much there is time per player
const time_limit = 10;

// Global variables
// Is game ended?
let ended = false;
// Set how big gamefield should be at the beginning.
let initial_size = 5;
// Tics and toes in simple two dimensional array
let tics_and_toes = new Array(initial_size);
// Set player default marks
let player_1_mark = "x";
let player_2_mark = "o";
// Keep count whos turn it is
let turn = player_1_mark;
// How much time is left per turn
let time = time_limit;
// Timer object for stop handle
let timer_handle;

function get_state() {
  let server_request = new XMLHttpRequest();
  let error = document.getElementById("error");

  // Define what happens on successful data submission
  server_request.addEventListener('load', function (results) {
    error.innerHTML = "";
    if (server_request.status === 200) {
      console.log("Data laod succesfully!");
      let data = JSON.parse(server_request.response);
      tics_and_toes = data.table;
      turn = data.turn;
      common_init();
    }
    else {
      empty_init();
    }
  });
  server_request.addEventListener('error', function (results) {
    error.innerHTML("Welcome new commer!");
    empty_init();
  });

  // Do GET request
  server_request.open("GET", "/api/get_status");
  server_request.send();
}

function empty_init() {
  // Generate two dimensional array by putting lists inside lists
  for (let x = 0; x < initial_size; x++) {
    tics_and_toes[x] = new Array(initial_size);
    initialize_array(tics_and_toes[x], "");
  }
  common_init();
}

function common_init() {
  // Render initial table
  render_table(tics_and_toes);
  // Set initial visual timer value
  update_bar();
  // Start timer
  timer_handle = setInterval(update_timer, 1000);
  // Update player text
  let player_turn = document.getElementById("player_turn");
  player_turn.innerHTML = turn + " turn";
}

function update_table(tics_and_toes, x_start, y_start) {
  // If the last tick or toe came closer than three spaces to edge
  // Generate more space to that side
  let x_size = tics_and_toes.length;
  let y_size = tics_and_toes[0].length;
  let more = 0;
  // Generate space left
  if (x_start < free_at_least) {
    more = free_at_least - x_start
    for (let x = 0; x < more; x++) {
      tics_and_toes.unshift(new Array(y_size));
      initialize_array(tics_and_toes[0], "");
    }
  }
  // Generate space right
  if (x_size - x_start <= free_at_least) {
    more = free_at_least - (x_size - x_start) + 1
    for (let x = 0; x < more; x++) {
      tics_and_toes.push(new Array(y_size));
      initialize_array(tics_and_toes[x_size + x], "");
    }
  }
  // In case should be expanded to two directions
  x_size = tics_and_toes.length;
  // Generate space up
  if (y_start < free_at_least) {
    more = free_at_least - y_start
    for (let x = 0; x < x_size; x++) {
      for (let y = 0; y < more; y++) {
        tics_and_toes[x].unshift("");
      }
    }
  }
  // Generate space down
  if (y_size - y_start <= free_at_least) {
    more = free_at_least - (y_size - y_start) + 1
    for (let x = 0; x < x_size; x++) {
      for (let y = 0; y < more; y++) {
        tics_and_toes[x].push("");
      }
    }
  }
}

function initialize_array(array, mark) {
  for (let index = 0; index < array.length; index++) {
    array[index] = mark;
  }
}

function render_table(tics_and_toes) {
  let board = document.getElementById("board");
  // Clear board
  board.innerHTML = "";
  table = document.createElement("table");
  let x_size = tics_and_toes.length;
  let y_size = tics_and_toes[0].length;
  for (let y = 0; y < y_size; y++) {
    // Create rows
    let row = document.createElement("tr");
    for (let x = 0; x < x_size; x++) {
      // Create columns for rows
      let column = document.createElement("td");
      // Add click handeler
      column.addEventListener("click", click_event);
      // Write tic or toe based on the two dimensional array
      column.innerHTML = tics_and_toes[x][y];
      // Add style based on player
      column.className = tics_and_toes[x][y];
      // Add column to row
      row.appendChild(column);
    }
    // Add row to table
    table.appendChild(row);
  }
  // Show table
  board.appendChild(table);
}

function click_event() {
  // Check has the game ended allready
  if (ended === true) {
    return;
  }
  // Get cell coordinates from the object
  let x = this.cellIndex;
  let y = this.parentNode.rowIndex;
  if (tics_and_toes[x][y] === "") {
    // Update cell if there is no marking allredy
    tics_and_toes[x][y] = turn;
    change_player_turn();
  }
  // Calculate straight count
  // This gotta be done before updates otherwise
  // function will check wrong position
  let is_winner = check_status(tics_and_toes, x, y);
  let mark = tics_and_toes[x][y];
  // Update table incase there is need for new space
  if (expanding === true) {
    update_table(tics_and_toes, x, y);
  }
  // Render new table
  render_table(tics_and_toes);
  // Check wether either player won the game
  check_winner(is_winner, mark)
}

function change_player_turn() {
  // Update whos turn text field
  player_turn = document.getElementById("player_turn");
  // Change turns
  if (turn === player_1_mark) {
    turn = player_2_mark;
    player_turn.innerHTML = player_2_mark + " turn";
  } else {
    turn = player_1_mark;
    player_turn.innerHTML = player_1_mark + " turn";
  }
  // Reset turn time
  time = time_limit;
  // Update time visuals
  update_bar();
  reset_timer();
  // Update server status
  send_status();
}

function check_status(tics_and_toes, x, y) {
  // Check winner from x and y position
  // Define variables
  let first;
  let second;
  // Check left and right, up and down and diagonal directions based on check table
  for (check = 0; check < check_table.length; check++) {
    let first = check_lines(tics_and_toes, x, y, check_table[check][0], check_table[check][1]);
    let second = check_lines(tics_and_toes, x, y, -check_table[check][0], -check_table[check][1]);
    // If there is at least needed count return immidiately
    if (first + second - 1 >= needed_count) {
      return true;
    }
  }
  return false;
}


function check_lines(tics_and_toes, start_x, start_y, direction_x, direction_y) {
  // Check lines using basic analytical math
  // Return line lenght
  let mark = tics_and_toes[start_x][start_y];
  let x_size = tics_and_toes.length;
  let y_size = tics_and_toes[0].length;
  let x;
  let y;
  let count
  for (count = 1; count < needed_count; count++) {
    x = start_x + direction_x * count;
    y = start_y + direction_y * count;
    // Check have we reatched edge
    if (x < 0 || x >= x_size || y < 0 || y >= y_size) {
      break;
    }
    if (tics_and_toes[x][y] !== mark) {
      // If found different mark break and return length
      break;
    }

  }
  return count;
}

function check_winner(is_winner, mark) {
  // Check do we have a winner
  if (is_winner === true) {
    if (mark === player_1_mark) {
      alert("Player 1 won!");
    } else {
      alert("Player 2 won!");
    }
    restart();
  }
}

function send_status() {
  let server_request = new XMLHttpRequest();
  let error = document.getElementById("error");

  // Define what happens on successful data submission
  server_request.addEventListener('load', function (event) {
    error.innerHTML = "";
    console.log("Data send succesfully!");
  });
  server_request.addEventListener('error', function (event) {
    error.innerHTML("Connection between server and the client is abnormal.<br> Game status might not save properly.");
  });

  // Prepare request data
  let data = { table: tics_and_toes, turn: turn };
  let request = JSON.stringify(data);

  // Do POST request
  server_request.open("POST", "/api/save_status");
  server_request.setRequestHeader("Content-Type", "application/json");
  server_request.send(request);
}

function update_timer() {
  // Update time bar and change turns if necessary
  time -= 1;
  if (time === 0) {
    change_player_turn();
  }
  update_bar();
}

function reset_timer() {
  // Reset timer for accurate time measurement
  clearInterval(timer_handle);
  timer_handle = setInterval(update_timer, 1000);
}

function update_bar() {
  let timer = document.getElementById("timer");
  let timer_text = document.getElementById("timer_text");
  let percent = time / time_limit;
  timer.style.width = (1 - percent) * 100 + "%";
  // Make bar from green to red
  timer.style.backgroundColor = "rgba(" + String(255 - percent * 255) + "," + String(percent * 255) + ",0,0.6)";
  timer_text.innerHTML = String(time);
}

function restart() {
  // Reset the game and server status
  turn = "x";
  tics_and_toes = [];
  time = time_limit;
  clearInterval(timer_handle);
  empty_init();
  send_status();
}

get_state();
