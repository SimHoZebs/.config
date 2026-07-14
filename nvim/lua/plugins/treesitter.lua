return {
  {
    'nvim-treesitter/nvim-treesitter',
    branch = 'main',
    lazy = false,
    build = ':TSUpdate',
    config = function()
      local treesitter = require 'nvim-treesitter'
      treesitter.setup()

      vim.api.nvim_create_autocmd('FileType', {
        callback = function(event)
          local lang = vim.treesitter.language.get_lang(vim.bo[event.buf].filetype)
          if not lang or pcall(vim.treesitter.start, event.buf, lang) then
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
              end
            end)
          end)
        end,
      })

      vim.api.nvim_create_autocmd('FileType', {
        callback = function()
          pcall(function()
            vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
          end)
        end,
      })
    end,
  },
}
