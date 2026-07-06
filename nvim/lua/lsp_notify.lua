-- Readable LSP errors + a working `:LspLog`.
--
-- nvim-lspconfig removed `:LspLog`, and both core (`vim/lsp/buf.lua`) and
-- conform.nvim (`lsp_format.lua`) surface formatting failures as
-- `string.format('[LSP][%s] %s', client.name, err)` where `err` is the RPC
-- error *table*. Its `__tostring` (`vim/lsp/rpc.lua:format_rpc_error`) inlines
-- the full `data` stack trace, so the notification is one unreadable line and
-- the useful part (e.g. ktfmt `ParseError: 66:41`) is buried at its front.
-- We can't patch core (Homebrew-managed, wiped on upgrade), so we condense at
-- the `vim.notify` boundary instead and point at the log for the full trace.

local M = {}

-- Full text of the last condensed LSP error, per client, for `:LspError`.
M.last = {}

-- Trim a captured fragment to its first line: cut at a literal `\n` (the
-- stack trace arrives escaped, not as real newlines) or a real newline, and
-- flatten literal `\t`.
local function first_line(s)
  s = s:gsub('\\n.*$', ''):gsub('\n.*$', ''):gsub('\\t', ' ')
  return vim.trim(s)
end

--- Turn an `[LSP][name] ...` blob into a terse one-liner, or nil to pass through.
--- @param msg string
--- @return string? summary, string? client
local function summarize(msg)
  local client = msg:match '^%[LSP%]%[(.-)%]'
  if not client then
    return nil
  end
  -- Only touch the noisy RPC/exception blobs; leave normal LSP notices alone.
  if not (msg:find 'RPC%[Error%]' or msg:find 'data =' or msg:find '[Ee]xception') then
    return nil
  end

  -- Most useful first: a formatter/compiler parse error carries a line:col.
  local detail = msg:match 'ParseError:%s*([^"\\\n]+)'
  if detail then
    detail = 'ktfmt ParseError: ' .. detail
  end
  detail = detail or msg:match 'Caused by:%s*([^"\\\n]+)'
  detail = detail or msg:match '([%w%.]+Exception[^"\\\n]*)'
  -- Fall back to the human `message`, then to whatever follows the prefix.
  detail = detail or msg:match 'message = "(.-)"'
  detail = detail or msg:match '^%[LSP%]%[.-%]%s*(.+)$'
  if not detail then
    return nil
  end

  return ('[LSP][%s] %s  (:LspLog)'):format(client, first_line(detail)), client
end

-- Wrap whatever `vim.notify` currently is with our condenser. noice claims
-- `vim.notify` on a scheduled tick and never forwards normal notifications to
-- the wrapped original, so we must sit OUTERMOST — i.e. install after noice.
-- Deferring the wrap two event-loop ticks past setup lands us after noice's
-- own single `vim.schedule(load)`; the commands below don't race, so they
-- register immediately.
local function install_wrap()
  if M._wrapped then
    return
  end
  M._wrapped = true

  local base = vim.notify
  vim.notify = function(msg, level, opts)
    if type(msg) == 'string' then
      local ok, summary, client = pcall(summarize, msg)
      if ok and summary then
        M.last[client] = msg
        M.last._recent = msg
        return base(summary, level, opts)
      end
    end
    return base(msg, level, opts)
  end
end

function M.setup()
  if M._installed then
    return
  end
  M._installed = true

  -- Run after noice's deferred takeover (see install_wrap).
  if vim.v.vim_did_enter == 1 then
    vim.schedule(function()
      vim.schedule(install_wrap)
    end)
  else
    vim.api.nvim_create_autocmd('VimEnter', {
      once = true,
      callback = function()
        vim.schedule(install_wrap)
      end,
    })
  end

  local function log_path()
    local ok, name = pcall(function()
      return vim.lsp.log.get_filename()
    end)
    return ok and name or vim.lsp.get_log_path()
  end

  vim.api.nvim_create_user_command('LspLog', function()
    local path = log_path()
    -- autoread + jump to tail so the split tracks the live log.
    vim.cmd('botright split | view ' .. vim.fn.fnameescape(path))
    vim.bo.autoread = true
    vim.cmd 'normal! G'
  end, { desc = 'Open the LSP log at its tail' })

  vim.api.nvim_create_user_command('LspError', function()
    local full = M.last._recent
    if not full then
      vim.notify('No condensed LSP error captured yet', vim.log.levels.INFO)
      return
    end
    -- Scratch buffer holds the exact original blob we shortened.
    vim.cmd 'botright new'
    vim.bo.buftype, vim.bo.bufhidden, vim.bo.swapfile = 'nofile', 'wipe', false
    vim.api.nvim_buf_set_lines(0, 0, -1, false, vim.split(full, '\n', { plain = true }))
  end, { desc = 'Show the full text of the last condensed LSP error' })

  vim.keymap.set('n', '<leader>ll', '<cmd>LspLog<CR>', { desc = 'LSP: open [l]og' })
  vim.keymap.set('n', '<leader>le', '<cmd>LspError<CR>', { desc = 'LSP: last [e]rror (full)' })
end

return M
