return {
  {
    'nvim-treesitter/nvim-treesitter',
    branch = 'main',
    lazy = false,
    build = ':TSUpdate',
    config = function()
      local treesitter = require 'nvim-treesitter'
      treesitter.setup()

      local function enable_indent(bufnr, lang)
        local ok, query = pcall(vim.treesitter.query.get, lang, 'indents')
        if ok and query then
          vim.bo[bufnr].indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
        end
      end

      vim.api.nvim_create_autocmd('FileType', {
        callback = function(event)
          local lang = vim.treesitter.language.get_lang(vim.bo[event.buf].filetype)
          if not lang then
            return
          end

          if pcall(vim.treesitter.start, event.buf, lang) then
            enable_indent(event.buf, lang)
            return
          end

          if not vim.list_contains(treesitter.get_available(), lang) then
            return
          end

          treesitter.install({ lang }):await(function(err, installed)
            vim.schedule(function()
              if err or not installed then
                vim.notify('Failed to install Tree-sitter parser for ' .. lang, vim.log.levels.ERROR)
              elseif vim.api.nvim_buf_is_valid(event.buf) then
                vim.treesitter.start(event.buf, lang)
                enable_indent(event.buf, lang)
              end
            end)
          end)
        end,
      })
    end,
  },
}
