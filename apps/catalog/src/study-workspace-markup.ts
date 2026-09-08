export const studyWorkspaceMarkup = `
  <section
    class="catalog-example example-study-workspace"
    data-catalog-study-workspace
    tabindex="0"
    aria-label="Spaced repetition study workspace"
  >
    <aside class="example-study-sidebar" aria-label="Study decks">
      <div class="example-study-sidebar-heading">
        <div>
          <span class="example-study-eyebrow">Library</span>
          <strong>Study</strong>
        </div>
        <ui-button
          type="button"
          size="xsmall"
          variant="quiet"
          compact
          aria-label="Create card"
          title="Create card"
          data-study-action="new-card"
        ><ui-icon name="action.add" label=""></ui-icon></ui-button>
      </div>
      <ui-input
        class="example-study-search"
        size="small"
        type="search"
        label="Search cards"
        placeholder="Search cards"
        data-study-search
      ><ui-icon slot="prefix" name="action.search" label=""></ui-icon></ui-input>
      <nav class="example-study-decks" aria-label="Decks" data-study-decks></nav>
      <div class="example-study-sidebar-footer">
        <span><span class="example-study-sync-dot"></span>Saved locally</span>
        <ui-button
          type="button"
          size="xsmall"
          variant="quiet"
          compact
          aria-label="Reset study data"
          title="Reset study data"
          data-study-action="reset"
        ><ui-icon name="action.refresh" label=""></ui-icon></ui-button>
      </div>
    </aside>

    <main class="example-study-main">
      <div class="example-study-topbar">
        <div class="example-study-title-group">
          <span class="example-study-eyebrow" data-study-deck-path>All decks</span>
          <h3 data-study-deck-title>Today</h3>
        </div>
        <ui-toggle-group
          class="example-study-mode"
          mode="single"
          value="review"
          label="Study view"
          data-study-mode
        >
          <ui-toggle value="review">Review</ui-toggle>
          <ui-toggle value="browse">Browse</ui-toggle>
        </ui-toggle-group>
        <ui-toolbar class="example-study-history" label="Study history">
          <ui-button
            type="button"
            size="xsmall"
            variant="quiet"
            compact
            aria-label="Undo last review"
            title="Undo last review"
            data-study-action="undo"
          ><ui-icon name="navigation.back" label=""></ui-icon></ui-button>
        </ui-toolbar>
        <ui-button class="example-study-new-card" type="button" size="small" variant="primary" aria-label="New card" title="New card" data-study-action="new-card">
          <ui-icon slot="prefix" name="action.add" label=""></ui-icon>
          <span>New card</span>
        </ui-button>
      </div>

      <section class="example-study-review-view" data-study-view="review">
        <div class="example-study-review-column">
          <div class="example-study-queue-heading">
            <div class="example-study-queue-copy">
              <span data-study-position>Card 1 of 1</span>
              <span data-study-session-copy>0 reviewed this session</span>
            </div>
            <ui-progress value="0" max="1" label="Review progress" data-study-progress></ui-progress>
          </div>

          <article class="example-study-card" data-study-card aria-live="polite">
            <div class="example-study-card-meta">
              <div>
                <ui-badge size="small" data-study-card-state>New</ui-badge>
                <span data-study-card-deck>Deck</span>
              </div>
              <ui-menu label="Card actions" density="compact" sizing="fixed" placement="bottom" align="end">
                <ui-button slot="trigger" type="button" size="xsmall" variant="quiet" compact aria-label="Card actions">
                  <ui-icon name="navigation.more.horizontal" label=""></ui-icon>
                </ui-button>
                <ui-menu-item value="edit" data-study-action="edit-current">
                  <ui-icon slot="prefix" name="action.edit" label=""></ui-icon>Edit card
                  <ui-kbd slot="suffix">E</ui-kbd>
                </ui-menu-item>
                <ui-menu-item value="suspend" data-study-action="suspend-current">
                  <ui-icon slot="prefix" name="action.pause" label=""></ui-icon>Suspend
                  <ui-kbd slot="suffix">S</ui-kbd>
                </ui-menu-item>
              </ui-menu>
            </div>

            <div class="example-study-prompt">
              <span class="example-study-card-label">Prompt</span>
              <div class="example-study-card-copy" data-study-front></div>
              <div class="example-study-tags" data-study-tags></div>
            </div>

            <ui-reveal class="example-study-answer-reveal" data-study-answer-reveal>
              <div class="example-study-answer">
                <span class="example-study-card-label">Answer</span>
                <div class="example-study-card-copy" data-study-back></div>
                <p class="example-study-note" data-study-note></p>
              </div>
            </ui-reveal>
          </article>

          <div class="example-study-review-controls">
            <ui-button type="button" size="large" variant="primary" data-study-action="reveal">
              Show answer <ui-kbd slot="suffix">Space</ui-kbd>
            </ui-button>
            <div class="example-study-rating-grid" data-study-ratings hidden>
              <ui-button type="button" size="large" variant="secondary" tone="critical" data-study-rating="again">
                <span class="example-study-rating-copy"><strong>Again</strong><small data-study-rating-interval="again">1m</small></span><ui-kbd slot="suffix">1</ui-kbd>
              </ui-button>
              <ui-button type="button" size="large" variant="secondary" data-study-rating="hard">
                <span class="example-study-rating-copy"><strong>Hard</strong><small data-study-rating-interval="hard">6m</small></span><ui-kbd slot="suffix">2</ui-kbd>
              </ui-button>
              <ui-button type="button" size="large" variant="secondary" tone="positive" data-study-rating="good">
                <span class="example-study-rating-copy"><strong>Good</strong><small data-study-rating-interval="good">1d</small></span><ui-kbd slot="suffix">3</ui-kbd>
              </ui-button>
              <ui-button type="button" size="large" variant="primary" data-study-rating="easy">
                <span class="example-study-rating-copy"><strong>Easy</strong><small data-study-rating-interval="easy">4d</small></span><ui-kbd slot="suffix">4</ui-kbd>
              </ui-button>
            </div>
          </div>

          <div class="example-study-complete" data-study-complete hidden>
            <ui-icon name="action.confirm" size="large" label=""></ui-icon>
            <h4>Queue complete</h4>
            <p>You cleared every due card in this deck.</p>
            <ui-button type="button" variant="secondary" data-study-action="browse">Browse cards</ui-button>
          </div>
        </div>

        <aside class="example-study-session" aria-label="Study session">
          <div class="example-study-session-heading">
            <strong>Today</strong>
            <ui-badge size="small" tone="positive" data-study-streak>12 day streak</ui-badge>
          </div>
          <dl class="example-study-queue-stats">
            <div><dt><span class="example-study-legend example-study-legend-new"></span>New</dt><dd data-study-count="new">0</dd></div>
            <div><dt><span class="example-study-legend example-study-legend-learning"></span>Learning</dt><dd data-study-count="learning">0</dd></div>
            <div><dt><span class="example-study-legend example-study-legend-review"></span>Review</dt><dd data-study-count="review">0</dd></div>
          </dl>
          <ui-separator></ui-separator>
          <div class="example-study-retention">
            <div><span>Retention</span><strong data-study-retention>91%</strong></div>
            <ui-meter value="91" min="0" max="100" label="Session retention"></ui-meter>
          </div>
          <div class="example-study-session-metrics">
            <div><span>Reviewed</span><strong data-study-reviewed>0</strong></div>
            <div><span>Again</span><strong data-study-again>0</strong></div>
            <div><span>Average</span><strong data-study-average>0s</strong></div>
          </div>
          <ui-separator></ui-separator>
          <div class="example-study-shortcuts">
            <span><ui-kbd>Space</ui-kbd> reveal</span>
            <span><ui-kbd>1–4</ui-kbd> rate</span>
            <span><ui-kbd>E</ui-kbd> edit</span>
            <span><ui-kbd>S</ui-kbd> suspend</span>
          </div>
        </aside>
      </section>

      <section class="example-study-browse-view" data-study-view="browse" hidden>
        <div class="example-study-browser">
          <div class="example-study-browser-toolbar">
            <div>
              <strong>Cards</strong>
              <span data-study-browser-count>0 cards</span>
            </div>
            <ui-input size="small" type="search" label="Filter cards" placeholder="Filter cards" data-study-browser-search>
              <ui-icon slot="prefix" name="action.search" label=""></ui-icon>
            </ui-input>
          </div>
          <div class="example-study-card-list" role="listbox" aria-label="Cards" data-study-card-list></div>
        </div>

        <form class="example-study-editor" data-study-editor>
          <div class="example-study-editor-heading">
            <div>
              <span class="example-study-eyebrow">Card editor</span>
              <strong data-study-editor-title>Edit card</strong>
            </div>
            <ui-badge size="small" data-study-editor-state>Draft</ui-badge>
          </div>
          <ui-field label="Card type">
            <ui-select slot="control" size="small" label="Card type" value="basic" data-study-field="type">
              <ui-option value="basic">Basic</ui-option>
              <ui-option value="cloze">Cloze</ui-option>
            </ui-select>
          </ui-field>
          <ui-field label="Front" description="For cloze cards, wrap hidden text in {{double braces}}.">
            <ui-textarea slot="control" rows="4" data-study-field="front"></ui-textarea>
          </ui-field>
          <ui-field label="Back">
            <ui-textarea slot="control" rows="5" data-study-field="back"></ui-textarea>
          </ui-field>
          <div class="example-study-editor-grid">
            <ui-field label="Deck">
              <ui-select slot="control" size="small" label="Deck" value="Design systems" data-study-field="deck">
                <ui-option value="Design systems">Design systems</ui-option>
                <ui-option value="Biology">Biology</ui-option>
                <ui-option value="French">French</ui-option>
              </ui-select>
            </ui-field>
            <ui-field label="Tags">
              <ui-input slot="control" size="small" placeholder="tokens, css" data-study-field="tags"></ui-input>
            </ui-field>
          </div>
          <ui-file-upload
            class="example-study-media-upload"
            accept="image/*,audio/*"
            label="Attach image or audio"
            max-size="52428800"
            data-study-media-upload
          ><ui-icon slot="prefix" name="action.upload" label=""></ui-icon>Attach media<span slot="description">Image or audio up to 50 MB</span></ui-file-upload>
          <div class="example-study-editor-actions">
            <ui-button type="button" size="small" variant="quiet" tone="critical" data-study-action="delete-card">Delete</ui-button>
            <span></span>
            <ui-button type="button" size="small" variant="secondary" data-study-action="cancel-edit">Cancel</ui-button>
            <ui-button type="submit" size="small" variant="primary">Save card</ui-button>
          </div>
        </form>
      </section>
    </main>

    <footer class="example-study-footer">
      <output aria-live="polite" data-study-status>Ready to study.</output>
      <span data-study-due-summary>0 due today</span>
    </footer>
  </section>
`;
