import { getMarkdown } from 'stream-markdown-parser'
import { describe, expect, it } from 'vitest'

describe('数学公式解析测试', () => {
  it('应该正确解析单独方括号数学公式块', () => {
    const md = getMarkdown('test')

    const testContent = `### 付费转化率计算验证
1. **公式**  
   \\[
   \\text{付费转化率} = \\left( \\frac{\\text{付费用户数}}{\\text{月活用户数}} \\right) \\times 100\\%
   \\]

2. **代入数据**  
   \\[
   \\frac{363}{15,\\!135} \\times 100\\% = 2.398\\%
   \\]`

    const tokens = md.parse(testContent, {})

    // 查找数学块 tokens
    const mathBlocks = tokens.filter(token => token.type === 'math_block')

    console.log('所有 tokens:')
    tokens.forEach((token, i) => {
      console.log(
        `  ${i}: ${token.type} ${token.tag || ''} - ${(
          token.content || ''
        ).slice(0, 50)}...`,
      )
    })
    console.log('所有 tokens:')
    tokens.forEach((token, i) => {
      console.log(
        `  ${i}: ${token.type} ${token.tag || ''} - ${(
          token.content || ''
        ).slice(0, 50)}...`,
      )
    })

    console.log('\n数学块详情:')
    mathBlocks.forEach((block, i) => {
      console.log(`  数学块 ${i + 1}:`)
      console.log(`    内容: ${block.content}`)
      console.log(`    标记: ${block.markup}`)
    })

    // 验证是否找到了数学块
    expect(mathBlocks.length).toBeGreaterThan(0)
    expect(mathBlocks[0].content).toContain('付费转化率')
    expect(mathBlocks[0].markup).toBe('\\[\\]')
  })

  it('应该正确解析矩阵环境的数学公式', () => {
    const md = getMarkdown('test')

    const matrixContent = `\\[\n\\begin{bmatrix}\n2x_2 - 8x_3 = 8 \\\\n+5x_1 - 5x_3 = 10\n\\end{bmatrix}\n\\]`

    const tokens = md.parse(matrixContent, {})

    const mathBlocks = tokens.filter(token => token.type === 'math_block')

    console.log('\n=== 矩阵环境测试 ===')
    console.log('数学块数量:', mathBlocks.length)
    mathBlocks.forEach((block, i) => {
      console.log(`数学块 ${i + 1}: ${block.content}`)
    })

    expect(mathBlocks.length).toBeGreaterThanOrEqual(1)
    expect(mathBlocks[0].content).toContain('bmatrix')
    expect(mathBlocks[0].content).toContain('2x_2')
    expect(mathBlocks[0].markup).toBe('\\[\\]')
  })

  it('应该正确解析你提供的完整测试内容', () => {
    const md = getMarkdown('test')

    const streamContent = `
$$E=mc^2$$
根据严格计算验证，ABC文化有限公司2019年1-3月的用户付费转化率准确值为 **2.398%**（四舍五入后为2.4%）。以下是完整说明：

### 付费转化率计算验证
1. **公式**  
   \\[
   \\text{付费转化率} = \\left( \\frac{\\text{付费用户数}}{\\text{月活用户数}} \\right) \\times 100\\%
   \\]

2. **代入数据**  
   \\[
   \\frac{363}{15,\\!135} \\times 100\\% = 2.398\\%
   \\]

3. **计算工具验证**  
   通过数学计算工具确认结果：  
   \`363 ÷ 15,135 × 100 = 2.39841427...\`

4. **差异说明**  
   原始报告中四舍五入后的2.4%与精确值2.398%的差异源于保留小数位数的不同，实际误差仅0.002%，在业务分析中可忽略不计。`

    const tokens = md.parse(streamContent, {})

    // 查找数学块 tokens
    const mathBlocks = tokens.filter(token => token.type === 'math_block')

    console.log('\\n=== 完整内容测试 ===')
    console.log('数学块数量:', mathBlocks.length)
    mathBlocks.forEach((block, i) => {
      console.log(`数学块 ${i + 1}:`)
      console.log(`  内容: ${block.content}`)
      console.log(`  标记: ${block.markup}`)
      console.log('---')
    })

    // 应该找到至少 3 个数学块：$$E=mc^2$$，第一个 \\[...\\]，第二个 \\[...\\]
    expect(mathBlocks.length).toBeGreaterThanOrEqual(3)

    // 验证第一个数学块是 E=mc^2
    expect(mathBlocks[0].content.trim()).toBe('E=mc^2')
    expect(mathBlocks[0].markup).toBe('$$')

    // 验证第二个数学块包含付费转化率公式
    expect(mathBlocks[1].content).toContain('付费转化率')
    expect(mathBlocks[1].markup).toBe('\\[\\]')

    // 验证第三个数学块包含代入数据
    expect(mathBlocks[2].content).toContain('363')
    expect(mathBlocks[2].markup).toBe('\\[\\]')
  })

  it('应该正确解析新的完整内容（包含单反斜杠数学公式）', () => {
    const md = getMarkdown('test')

    const newContent = `$$E=mc^2$$
### 付费转化率计算验证
1. **公式**  
   \\[
   \\text{付费转化率} = \\left( \\frac{\\text{付费用户数}}{\\text{月活用户数}} \\right) \\times 100\\%
   \\]

2. **代入数据**  
   \\[
   \\frac{363}{15,\\!135} \\times 100\\% = 2.398\\%
   \\]

3. **计算工具验证**  
   通过数学计算工具确认结果：  
   \`363 ÷ 15,135 × 100 = 2.39841427...\`

4. **差异说明**  
   原始报告中四舍五入后的2.4%与精确值2.398%的差异源于保留小数位数的不同，实际误差仅0.002%，在业务分析中可忽略不计。`

    const tokens = md.parse(newContent, {})

    // 查找数学块 tokens
    const mathBlocks = tokens.filter(token => token.type === 'math_block')

    console.log('\\n=== 新内容测试 ===')
    console.log('数学块数量:', mathBlocks.length)
    mathBlocks.forEach((block, i) => {
      console.log(`数学块 ${i + 1}:`)
      console.log(`  内容: ${block.content}`)
      console.log(`  标记: ${block.markup}`)
      console.log('---')
    }) // 应该找到 3 个数学块：$$E=mc^2$$，第一个 \\[...\\]，第二个 \\[...\\]
    expect(mathBlocks.length).toBe(3)

    // 验证第一个数学块是 E=mc^2
    expect(mathBlocks[0].content.trim()).toBe('E=mc^2')
    expect(mathBlocks[0].markup).toBe('$$')

    // 验证第二个数学块包含付费转化率公式
    expect(mathBlocks[1].content).toContain('付费转化率')
    expect(mathBlocks[1].markup).toBe('\\[\\]')

    // 验证第三个数学块包含代入数据
    expect(mathBlocks[2].content).toContain('363')
    expect(mathBlocks[2].content).toContain('2.398\\%')
    expect(mathBlocks[2].markup).toBe('\\[\\]')
  })
})
