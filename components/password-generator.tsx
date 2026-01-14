'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Copy, Check, RefreshCw } from 'lucide-react'

interface PasswordGeneratorProps {
  onCopy: (text: string, label: string) => void
  copiedItem: string | null
}

export default function PasswordGenerator({ onCopy, copiedItem }: PasswordGeneratorProps) {
  const [password, setPassword] = useState('')
  const [length, setLength] = useState(16)
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  })

  const generatePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'

    let chars = ''
    if (options.uppercase) chars += uppercase
    if (options.lowercase) chars += lowercase
    if (options.numbers) chars += numbers
    if (options.symbols) chars += symbols

    if (chars === '') {
      chars = lowercase // 至少包含小写字母
    }

    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    setPassword(result)
  }

  const handleCopyPassword = () => {
    onCopy(password, '密码')
    // 延迟300ms后生成新密码，让用户看到复制动画
    setTimeout(() => {
      generatePassword()
    }, 300)
  }

  // 计算密码强度
  const getPasswordStrength = () => {
    let strength = 0
    if (options.uppercase) strength++
    if (options.lowercase) strength++
    if (options.numbers) strength++
    if (options.symbols) strength++

    if (length < 8) return { label: '弱', color: 'text-destructive', bg: 'bg-destructive/20' }
    if (length < 12 && strength < 3) return { label: '中', color: 'text-yellow-500', bg: 'bg-yellow-500/20' }
    if (length < 16 && strength < 4) return { label: '强', color: 'text-accent', bg: 'bg-accent/20' }
    return { label: '极强', color: 'text-success', bg: 'bg-success/20' }
  }

  const strength = getPasswordStrength()

  return (
    <Card className="p-6 bg-card border-border h-fit">
      <Label className="text-base font-semibold mb-4 block">
        随机密码生成器
      </Label>

      {/* 密码显示 */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-3 bg-secondary rounded-lg border border-border font-mono text-sm break-all min-h-[48px] flex items-center">
            {password || '设置选项后点击生成'}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyPassword}
            disabled={!password}
            className="shrink-0"
          >
            {copiedItem === '密码' ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {password && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">密码强度:</span>
            <span className={`text-sm font-semibold px-2 py-1 rounded ${strength.bg} ${strength.color}`}>
              {strength.label}
            </span>
          </div>
        )}

        <Button 
          onClick={generatePassword} 
          className="w-full"
          size="lg"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          生成密码
        </Button>
      </div>

      {/* 密码长度 */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <Label className="text-sm">密码长度</Label>
          <span className="text-sm font-mono bg-secondary px-2 py-1 rounded">
            {length}
          </span>
        </div>
        <Slider
          value={[length]}
          onValueChange={(value) => setLength(value[0])}
          min={6}
          max={32}
          step={1}
          className="w-full"
        />
      </div>

      {/* 密码选项 */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">包含字符</Label>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <Label htmlFor="uppercase" className="text-sm cursor-pointer">
              大写字母 (A-Z)
            </Label>
            <Switch
              id="uppercase"
              checked={options.uppercase}
              onCheckedChange={(checked) =>
                setOptions({ ...options, uppercase: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <Label htmlFor="lowercase" className="text-sm cursor-pointer">
              小写字母 (a-z)
            </Label>
            <Switch
              id="lowercase"
              checked={options.lowercase}
              onCheckedChange={(checked) =>
                setOptions({ ...options, lowercase: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <Label htmlFor="numbers" className="text-sm cursor-pointer">
              数字 (0-9)
            </Label>
            <Switch
              id="numbers"
              checked={options.numbers}
              onCheckedChange={(checked) =>
                setOptions({ ...options, numbers: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <Label htmlFor="symbols" className="text-sm cursor-pointer">
              特殊符号 (!@#$...)
            </Label>
            <Switch
              id="symbols"
              checked={options.symbols}
              onCheckedChange={(checked) =>
                setOptions({ ...options, symbols: checked })
              }
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
