import './style.css'
import { App } from './app.js'

const mount = document.querySelector('#app')

if (!mount) {
  throw new Error('Root element #app not found')
}

mount.innerHTML = getAppTemplate()

window.App = App
App.init()

function getAppTemplate() {
  return `
    <div class="app-shell">
      <header class="header">
        <div class="header-content">
          <h1>📊 QuarterView</h1>
          <div class="header-controls">
            <select id="quarterSelect" class="quarter-select" aria-label="Select quarter">
              <option value="Q1-2024">Q1 2024</option>
              <option value="Q2-2024">Q2 2024</option>
              <option value="Q3-2024">Q3 2024</option>
              <option value="Q4-2024">Q4 2024</option>
              <option value="Q1-2025">Q1 2025</option>
              <option value="Q2-2025">Q2 2025</option>
            </select>
            <button id="capacityBtn" class="btn btn-secondary">⚙️ Capacity Tool</button>
            <button id="exportBtn" class="btn btn-secondary">📥 Export</button>
            <button id="importBtn" class="btn btn-secondary">📤 Import</button>
            <button id="shareBtn" class="btn btn-secondary">🔗 Share</button>
          </div>
        </div>
      </header>

      <div class="toolbar">
        <div class="toolbar-left">
          <button id="addProjectBtn" class="btn btn-primary">+ Add Project</button>
          <div class="view-controls">
            <label for="viewTypeSelect">View:</label>
            <select id="viewTypeSelect" aria-label="Select view type">
              <option value="quarter">Quarter (13 weeks)</option>
              <option value="month">Single Month</option>
              <option value="6weeks">6 Weeks</option>
            </select>
            <select id="groupBySelect" aria-label="Group timeline by">
              <option value="person">By Person</option>
              <option value="project">By Project</option>
              <option value="status">By Status</option>
            </select>
          </div>
        </div>
        <div class="toolbar-right">
          <div class="filter-controls">
            <input type="text" id="searchInput" placeholder="Search projects..." class="search-input" aria-label="Search projects" />
            <button id="filterBtn" class="btn btn-icon" aria-label="Apply filters">🔍</button>
          </div>
        </div>
      </div>

      <div class="capacity-summary" id="capacitySummary">
        <div class="capacity-text">
          <span id="capacityAvailable">0</span> days available |
          <span id="capacityCommitted">0</span> committed |
          <span id="capacityFree">0</span> free
        </div>
        <div class="capacity-bar">
          <div class="capacity-bar-fill" id="capacityBarFill" style="width: 0%">
            <span id="capacityPercentage">0%</span>
          </div>
        </div>
      </div>

      <div class="gantt-container" id="ganttContainer">
        <div class="gantt-sidebar" id="ganttSidebar"></div>
        <div class="gantt-timeline" id="ganttTimeline"></div>
        <div class="gantt-tooltip" id="timelineTooltip" role="status" aria-live="polite"></div>
      </div>

      <section class="todo-panel hidden" id="unassignedPanel">
        <div class="todo-header">
          <div>
            <h2>📝 Unassigned Projects</h2>
            <p class="todo-hint">Drafts saved without assignees live here until you place them.</p>
          </div>
          <span class="todo-count" id="unassignedCount">0</span>
        </div>
        <div class="todo-list" id="unassignedList"></div>
      </section>

      <div class="empty-state" id="emptyState">
        <div class="empty-state-content">
          <h2>👋 Welcome to QuarterView!</h2>
          <p>Start by setting up your team capacity, then add your first project.</p>
          <button class="btn btn-primary btn-large" id="setupCapacityBtn">⚙️ Set Up Team Capacity</button>
          <button class="btn btn-secondary btn-large" id="addFirstProjectBtn">+ Add First Project</button>
        </div>
      </div>

      <div class="modal" id="capacityModal" aria-hidden="true" role="dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h2>⚙️ Capacity Estimator</h2>
            <button class="modal-close" id="closeCapacityModal" aria-label="Close capacity modal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <h3>Team Composition</h3>
              <div class="form-group">
                <label for="numEngineers">Number of Engineers:</label>
                <input type="number" id="numEngineers" value="5" min="1" max="50" />
              </div>
              <p class="form-hint">Assign each teammate to a regional PTO calendar and occupational rule.</p>
              <div class="team-members-header">
                <span>Name</span>
                <span>Region</span>
                <span>Role</span>
              </div>
              <div id="teamMembersList" class="team-members-list"></div>
              <button class="btn btn-small" id="addTeamMemberBtn" type="button">+ Add Team Member</button>
            </div>
            <div class="form-section">
              <h3>Time Off & Holidays</h3>
              <div class="form-group">
                <label for="ptoPerPerson">Average PTO days per person:</label>
                <input type="number" id="ptoPerPerson" value="8" min="0" max="30" />
              </div>
              <div class="form-group">
                <label for="companyHolidays">Company holidays (auto-calculated):</label>
                <input type="number" id="companyHolidays" value="10" min="0" max="30" disabled />
              </div>
            </div>

            <div class="form-section">
              <div class="config-section-header">
                <h3>Regional PTO Calendars</h3>
                <span class="config-columns">Name · PTO Days · Holidays</span>
              </div>
              <div id="regionSettingsList" class="config-list"></div>
              <button class="btn btn-small" id="addRegionBtn" type="button">+ Add Region</button>
            </div>

            <div class="form-section">
              <div class="config-section-header">
                <h3>Occupational Focus Rules</h3>
                <span class="config-columns">Name · Focus %</span>
              </div>
              <div id="roleSettingsList" class="config-list"></div>
              <button class="btn btn-small" id="addRoleBtn" type="button">+ Add Role Rule</button>
            </div>

            <div class="form-section">
              <h3>Reserve Buffers</h3>
              <div class="form-group">
                <label for="adhocReserve">Ad-hoc work reserve:</label>
                <select id="adhocReserve">
                  <option value="10">10% - Stable team</option>
                  <option value="20" selected>20% - Recommended</option>
                  <option value="30">30% - New team</option>
                  <option value="40">40% - High support</option>
                </select>
              </div>
              <div class="form-group">
                <label for="bugReserve">Bug fixes reserve:</label>
                <select id="bugReserve">
                  <option value="5">5% - New product</option>
                  <option value="10" selected>10% - Typical</option>
                  <option value="15">15% - Legacy system</option>
                </select>
              </div>
            </div>

            <div class="capacity-result">
              <h3>Capacity Summary</h3>
              <div class="capacity-breakdown">
                <div class="breakdown-row">
                  <span>Theoretical capacity:</span>
                  <span id="theoreticalCapacity">0 days</span>
                </div>
                <div class="breakdown-row negative">
                  <span>- Time off (PTO + Holidays):</span>
                  <span id="timeOffTotal">-0 days</span>
                </div>
                <div class="breakdown-row negative">
                  <span>- Reserves (Ad-hoc + Bugs):</span>
                  <span id="reserveTotal">-0 days</span>
                </div>
                <div class="breakdown-row total">
                  <span><strong>Net Available Capacity:</strong></span>
                  <span id="netCapacity"><strong>0 days</strong></span>
                </div>
              </div>
              <div class="member-breakdown" id="memberBreakdownList">
                <p class="member-breakdown-empty">Add regions & roles to see per-person rollups.</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="cancelCapacityBtn">Cancel</button>
            <button class="btn btn-primary" id="applyCapacityBtn">Apply to Gantt</button>
          </div>
        </div>
      </div>

      <div class="modal" id="projectModal" aria-hidden="true" role="dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="projectModalTitle">+ Add Project</h2>
            <button class="modal-close" id="closeProjectModal" aria-label="Close project modal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="projectName">Project Name: *</label>
              <input type="text" id="projectName" placeholder="e.g., User Authentication Redesign" required />
            </div>
            <div class="form-group">
              <label for="projectAssignee">Assignee(s):</label>
              <select id="projectAssignee" multiple size="5" aria-label="Assign team members"></select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="projectStartDate">Start Date: *</label>
                <input type="date" id="projectStartDate" required />
              </div>
              <div class="form-group">
                <label for="projectEndDate">End Date: *</label>
                <input type="date" id="projectEndDate" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="projectStatus">Status:</label>
                <select id="projectStatus">
                  <option value="planned">Planned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="at-risk">At Risk</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div class="form-group">
                <label for="projectConfidence">Confidence:</label>
                <select id="projectConfidence">
                  <option value="high">High</option>
                  <option value="medium" selected>Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="projectType">Project Type:</label>
              <select id="projectType">
                <option value="feature">Feature</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="bug-fix">Bug Fix</option>
                <option value="tech-debt">Tech Debt</option>
              </select>
            </div>
            <div class="form-group">
              <label for="projectDescription">Description:</label>
              <textarea id="projectDescription" rows="3" maxlength="500" placeholder="Optional description..."></textarea>
            </div>
            <div class="form-section">
              <h3>ICE Score Helper</h3>
              <div class="form-row">
                <div class="form-group">
                  <label for="projectImpact">Impact (1-10):</label>
                  <input type="number" id="projectImpact" min="1" max="10" value="5" />
                </div>
                <div class="form-group">
                  <label for="projectConfidenceScore">Confidence (1-10):</label>
                  <input type="number" id="projectConfidenceScore" min="1" max="10" value="5" />
                </div>
                <div class="form-group">
                  <label for="projectEffort">Effort (1-10):</label>
                  <input type="number" id="projectEffort" min="1" max="10" value="5" />
                </div>
              </div>
              <p class="form-hint">ICE Score: <span id="projectIceScore">25</span></p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="cancelProjectBtn">Cancel</button>
            <button class="btn btn-danger" id="deleteProjectBtn" style="display:none;">Delete</button>
            <button class="btn btn-primary" id="saveProjectBtn">Save Project</button>
          </div>
        </div>
      </div>

      <div class="modal" id="exportModal" aria-hidden="true" role="dialog">
        <div class="modal-content modal-small">
          <div class="modal-header">
            <h2>📥 Export</h2>
            <button class="modal-close" id="closeExportModal" aria-label="Close export modal">&times;</button>
          </div>
          <div class="modal-body">
            <button class="btn btn-secondary btn-block" id="exportPNGBtn">📸 Export as PNG</button>
            <button class="btn btn-secondary btn-block" id="exportCSVBtn">📊 Export as CSV</button>
            <button class="btn btn-secondary btn-block" id="exportJSONBtn">💾 Export Data (JSON)</button>
          </div>
        </div>
      </div>

      <div id="toast" class="toast" role="status" aria-live="polite"></div>
    </div>
  `
}
