import type SqlBricks from 'sql-bricks'
// @ts-expect-error mysql-bricks has no type declarations
import MySqlBricks from 'mysql-bricks'

const Bricks = MySqlBricks as unknown as typeof SqlBricks

export { Bricks as SqlBricks }
