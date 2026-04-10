-- M1: Canonicalize grid encoding
--
-- Canonical model (the only valid encoding going forward):
--   grid_x = row * 10 + col   (integer 0–99, for a 10-column × 10-row grid)
--   grid_y = 0                 (always; the second dimension is unused)
--
-- seed.sql was written against the old 20-column 2D spec:
--   grid_x = col   (0–19, within a 20-wide row)
--   grid_y = row_block (0 or 1, each block is 20 columns → 2 display rows)
--
-- GraveyardCanvas.dbToDisp had a matching gy*2 decoder for that scheme.
-- PlotPicker and approve/route.ts already use the 1D canonical encoding
-- and ignore grid_y, creating silent visual plot collisions once the grid
-- fills past display row 1.
--
-- This migration re-encodes all graves where grid_y > 0 to the canonical form:
--   new_grid_x = old_grid_y * 20 + old_grid_x
--   new_grid_y = 0
--
-- Derivation: a grave at 20-col position (col=c, row_block=b) maps to
-- 10-col display position (col=c%10, row=floor(c/10)+b*2), and the
-- canonical encoding of that is: gx = (floor(c/10)+b*2)*10 + c%10
--                                    = floor(c/10)*10 + b*20 + c%10
--                                    = c + b*20
--                                    = old_gx + old_gy * 20  ✓
--
-- After this migration dbToDisp no longer needs the gy*2 term.
-- GraveyardCanvas.tsx is updated in the same PR to remove it.

UPDATE graves
SET
  grid_x = grid_y * 20 + grid_x,
  grid_y = 0
WHERE
  grid_y > 0
  AND grid_x IS NOT NULL;
