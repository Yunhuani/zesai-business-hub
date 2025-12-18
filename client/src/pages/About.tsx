import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </a>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
            把顶级商业智慧，直接交付给你
          </h1>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-gray-700 leading-relaxed">
          {/* Section 1 */}
          <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-lg">
              泽思 AI（Zenith AI）不是通用 AI 工具，而是一个 <strong className="text-purple-600">AI 驱动的商业咨询交付平台</strong>。
            </p>
            <p className="text-lg mt-4">
              我们让高质量的商业决策，成为创业者和中小企业也能随时调用的能力。通过对话式输入，泽思 AI 将复杂的商业问题转化为结构化分析，并直接交付可用于决策和执行的专业商业文档，让原本昂贵、低效的顶级咨询能力实现规模化普惠。
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-lg">
              在商业世界中，真正稀缺的从来不是信息，而是<strong className="text-purple-600">高质量的判断</strong>。
            </p>
            <p className="text-lg mt-4">
              泽思AI的团队来自世界最顶级的咨询公司和AI科技公司，我们将顶级商业咨询方法论、分析框架和交付标准，通过 AI 的方式进行拆解、重构和产品化，让更多企业也能获得同样专业、系统的商业支持。
            </p>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-lg">
              泽思 AI 关注的不是"生成内容"，而是<strong className="text-purple-600">交付结果</strong>。
            </p>
            <p className="text-lg mt-4">
              用户无需掌握复杂的咨询模型，也无需整理繁琐报告，只需清晰描述真实的业务问题，系统便会像经验丰富的商业顾问一样完成分析、推演与判断，并直接输出可用于决策和执行的定制化的商业文档，包括战略分析、融资 BP、商业模式设计、市场与竞争分析、增长方案等。
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-lg">
              泽思 AI 不只是帮助用户更快完成工作，而是帮助他们<strong className="text-purple-600">做出更好的商业决策</strong>。
            </p>
            <p className="text-lg mt-4">
              我们相信，AI 的真正价值，不在于替代人的思考，而在于让高质量的思考被更高效、更公平地使用。当商业咨询能力能够被规模化交付，企业在关键决策节点上的成功概率，也将被重新定义。
            </p>
          </div>

          {/* Section 5 - Closing */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white shadow-lg">
            <p className="text-xl font-medium text-center">
              把顶级商业智慧，直接交付给你。
            </p>
            <p className="text-lg mt-4 text-center opacity-95">
              这是泽思 AI 的使命，也是我们对 AI 时代商业决策方式的回答。
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Link href="/">
            <a className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">
              开始使用泽思 AI
            </a>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>© 2025 泽思 Zenith AI - 专业AI商业咨询平台</p>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-600 transition-colors mt-2 inline-block"
          >
            沪ICP备2024048847号
          </a>
        </div>
      </footer>
    </div>
  );
}
