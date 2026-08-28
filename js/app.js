/* Habit Tracker - plain browser JS, no build step. */
(function () {
  'use strict';

  var STORAGE_KEY = 'habit-tracker:v1';
  var DAY_COUNT = 7;
  var DEFAULT_HABITS = ['Sports', 'Eating well', 'Drinking water', 'Walking', 'Reading'];

  var headRow = document.getElementById('habits-head');
  var body = document.getElementById('habits-body');
  var footRow = document.getElementById('habits-foot');
  var form = document.getElementById('add-habit-form');
  var nameInput = document.getElementById('habit-name');

  var state = load();
  var currentDays = []; // the day columns on screen, so the summary can redraw without a full render

  /* ---------- dates ---------- */

  // Local YYYY-MM-DD. Day columns are calendar days, not timestamps, so nothing
  // has to be compared across a DST boundary.
  function dateKey(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function recentDays(count) {
    var days = [];
    var today = new Date();
    today.setHours(12, 0, 0, 0); // midday anchor: stepping days can't slip over a DST change
    for (var i = count - 1; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d);
    }
    return days;
  }

  /* ---------- state ---------- */

  function makeId() {
    return 'h-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function seed() {
    return {
      habits: DEFAULT_HABITS.map(function (name) {
        return { id: makeId(), name: name };
      }),
      done: {}
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.habits) && parsed.done && typeof parsed.done === 'object') {
          return {
            habits: parsed.habits.filter(function (h) {
              return h && typeof h.id === 'string' && typeof h.name === 'string';
            }),
            done: parsed.done
          };
        }
      }
    } catch (err) {
      // Storage blocked, or saved data is corrupt. Start fresh rather than fail to load.
      console.warn('Could not read saved habits.', err);
    }
    return seed();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Could not save habits.', err);
    }
  }

  function doneKey(habitId, day) {
    return habitId + '|' + day;
  }

  function addHabit(name) {
    state.habits.push({ id: makeId(), name: name });
    save();
    render();
  }

  function removeHabit(habitId) {
    state.habits = state.habits.filter(function (h) {
      return h.id !== habitId;
    });
    // Drop the deleted habit's ticks so storage doesn't accumulate orphans.
    Object.keys(state.done).forEach(function (key) {
      if (key.slice(0, key.indexOf('|')) === habitId) delete state.done[key];
    });
    save();
    render();
  }

  function setDone(habitId, day, isDone) {
    var key = doneKey(habitId, day);
    if (isDone) {
      state.done[key] = true;
    } else {
      delete state.done[key];
    }
    save();
  }

  /* ---------- rendering ---------- */

  function render() {
    currentDays = recentDays(DAY_COUNT);
    var todayKey = dateKey(new Date());

    renderHead(currentDays, todayKey);
    renderBody(currentDays, todayKey);
    renderFoot(currentDays, todayKey);
  }

  function renderHead(days, todayKey) {
    headRow.textContent = '';

    var corner = document.createElement('th');
    corner.scope = 'col';
    corner.className = 'habits__corner';
    corner.textContent = 'Habit';
    headRow.appendChild(corner);

    days.forEach(function (date) {
      var key = dateKey(date);
      var th = document.createElement('th');
      th.scope = 'col';
      if (key === todayKey) th.classList.add('habits__day--today');

      var weekday = document.createElement('span');
      weekday.className = 'habits__day-name';
      weekday.textContent = date.toLocaleDateString(undefined, { weekday: 'short' });

      var num = document.createElement('span');
      num.className = 'habits__day-num';
      num.textContent = date.getDate();

      th.append(weekday, num);
      headRow.appendChild(th);
    });

    var actions = document.createElement('th');
    actions.scope = 'col';
    actions.className = 'habits__actions';
    var actionsLabel = document.createElement('span');
    actionsLabel.className = 'visually-hidden';
    actionsLabel.textContent = 'Delete';
    actions.appendChild(actionsLabel);
    headRow.appendChild(actions);
  }

  function renderBody(days, todayKey) {
    body.textContent = '';

    if (state.habits.length === 0) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.className = 'habits__empty';
      emptyCell.colSpan = days.length + 2;
      emptyCell.textContent = 'No habits yet. Add one above to get started.';
      emptyRow.appendChild(emptyCell);
      body.appendChild(emptyRow);
      return;
    }

    state.habits.forEach(function (habit) {
      var row = document.createElement('tr');

      var nameCell = document.createElement('th');
      nameCell.scope = 'row';
      nameCell.textContent = habit.name;
      row.appendChild(nameCell);

      days.forEach(function (date) {
        row.appendChild(dayCell(habit, date, todayKey));
      });

      var actionCell = document.createElement('td');
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'habit__delete';
      del.dataset.action = 'delete';
      del.dataset.habitId = habit.id;
      del.setAttribute('aria-label', 'Delete ' + habit.name);
      del.textContent = '×';
      actionCell.appendChild(del);
      row.appendChild(actionCell);

      body.appendChild(row);
    });
  }

  function countDone(day) {
    return state.habits.reduce(function (total, habit) {
      return total + (state.done[doneKey(habit.id, day)] === true ? 1 : 0);
    }, 0);
  }

  function renderFoot(days, todayKey) {
    footRow.textContent = '';
    if (state.habits.length === 0) return; // nothing to total, and no sane denominator

    var total = state.habits.length;

    var label = document.createElement('th');
    label.scope = 'row';
    label.textContent = 'Completed';
    footRow.appendChild(label);

    days.forEach(function (date) {
      var key = dateKey(date);
      var done = countDone(key);

      var cell = document.createElement('td');
      if (key === todayKey) cell.classList.add('habits__day--today');

      var count = document.createElement('span');
      count.className = 'summary__count';
      count.textContent = done + '/' + total;

      var percent = document.createElement('span');
      percent.className = 'summary__pct';
      percent.textContent = Math.round((done / total) * 100) + '%';

      cell.append(count, percent);
      footRow.appendChild(cell);
    });

    footRow.appendChild(document.createElement('td')); // lines up with the delete column
  }

  function dayCell(habit, date, todayKey) {
    var key = dateKey(date);
    var checked = state.done[doneKey(habit.id, key)] === true;

    var cell = document.createElement('td');
    if (key === todayKey) cell.classList.add('habits__day--today');
    if (checked) cell.classList.add('is-done');

    var label = document.createElement('label');
    label.className = 'check';

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'check__input';
    input.checked = checked;
    input.dataset.habitId = habit.id;
    input.dataset.date = key;
    input.setAttribute(
      'aria-label',
      habit.name + ' on ' + date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    );

    var mark = document.createElement('span');
    mark.className = 'check__mark';
    mark.setAttribute('aria-hidden', 'true');

    label.append(input, mark);
    cell.appendChild(label);
    return cell;
  }

  /* ---------- events (delegated on the table body) ---------- */

  body.addEventListener('change', function (event) {
    var input = event.target;
    if (!input.matches('.check__input')) return;

    setDone(input.dataset.habitId, input.dataset.date, input.checked);
    // Update just this cell rather than re-rendering, so the box keeps keyboard focus.
    input.closest('td').classList.toggle('is-done', input.checked);
    renderFoot(currentDays, dateKey(new Date())); // totals shifted, and the footer holds no focus
  });

  body.addEventListener('click', function (event) {
    var button = event.target.closest('[data-action="delete"]');
    if (!button) return;
    removeHabit(button.dataset.habitId);
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var name = nameInput.value.trim();
    if (!name) return;
    addHabit(name);
    nameInput.value = '';
    nameInput.focus();
  });

  render();
})();
