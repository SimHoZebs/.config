local js = function()
  local file = vim.fs.find({ 'biome.json', 'deno.json' }, { type = 'file', upward = true })[1]
  if file then
    local yeet = { file:match 'biome.json' and 'biome' or 'deno' }
    return yeet
  else
    return { 'prettierd' }
  end
end

return {
  { -- Autoformat
    'stevearc/conform.nvim',
    event = { 'BufWritePre' },
    opts = {
      notify_on_error = true,
      format_on_save = {
        timeout_ms = 1000,
        lsp_fallback = true,
      },
      formatters_by_ft = {
        lua = { 'stylua' },
        htmldjango = { 'djlint' },
        html = js,
        javascript = js,
        typescript = js,
        typescriptreact = js,
        javascriptreact = js,
        json = js,
        python = { 'black' },
        astro = { 'prettierd' },
        java = { 'clang-format' },
        php = { 'pretty-php' },
        yaml = { 'prettierd' },
        nginx = { 'nginxfmt' },
      },
      formatters = {
        deno = {
          command = 'deno',
          args = { 'fmt', '-' },
          stdin = true,
        },
      },
    },
  },
}
-- vim: ts=2 sts=2 sw=2 et
